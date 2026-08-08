import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';

import { MailOutbox, MailStatus } from './entities/mail-outbox.entity';
import { TelegramService } from '../telegram/telegram.service';

// 1 min, 5 min, 15 min, 1 h, 6 h — five attempts spread over ~7 hours, which
// outlasts any SMTP outage worth waiting through. Run out of them and the mail
// is declared dead rather than retried forever.
const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000];

const TICK_MS = 60_000;
const BATCH_SIZE = 20;

// A row left in SENDING for this long belongs to a process that died mid-send.
const STUCK_AFTER_MS = 5 * 60_000;

// Drains mail_outbox. Everything that actually talks to SMTP lives here, so
// MailService only ever renders a letter and writes it down — which is what
// makes the send survive a dead SMTP host or a restart.
@Injectable()
export class MailDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailDispatcher.name);
  private transporter: nodemailer.Transporter | null = null;
  private timer: NodeJS.Timeout | null = null;
  private draining: Promise<void> | null = null;

  constructor(
    @InjectRepository(MailOutbox)
    private readonly outboxRepository: Repository<MailOutbox>,
    private readonly telegramService: TelegramService,
  ) {}

  async onModuleInit() {
    if (!this.isConfigured()) {
      this.logger.warn(
        '[MAIL NOT CONFIGURED] SMTP_* unset — letters will be recorded as skipped',
      );
      return;
    }

    this.timer = setInterval(() => void this.drain(), TICK_MS);
    void this.drain();
  }

  // Waits out a drain in progress: shutting the database down underneath a
  // send would leave the letter stuck in SENDING, to be resent after the next
  // restart — a duplicate that costs nothing to avoid.
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.draining;
  }

  isConfigured(): boolean {
    return !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
  }

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;
    if (!this.isConfigured()) return null;

    const port = Number(process.env.SMTP_PORT);

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    return this.transporter;
  }

  private get from(): string {
    return process.env.SMTP_FROM || 'Viktorumm <no-reply@viktorumm.local>';
  }

  // A letter claimed by a process that then died — or by a send that hung —
  // would sit in SENDING forever, so hand those back to the queue. Claiming
  // stamps nextAttemptAt with the claim time, which makes it the age of the
  // claim here rather than the old due time.
  private async releaseStuck() {
    const cutoff = new Date(Date.now() - STUCK_AFTER_MS);

    const released = await this.outboxRepository.update(
      { status: MailStatus.SENDING, nextAttemptAt: LessThanOrEqual(cutoff) },
      { status: MailStatus.PENDING },
    );

    if (released.affected) {
      this.logger.warn(`Requeued ${released.affected} interrupted mail(s)`);
    }
  }

  // Called on a timer and, more importantly, the moment a letter is queued —
  // so the normal path is still immediate and the timer only carries retries.
  async drain(): Promise<void> {
    if (this.draining || !this.getTransporter()) return;

    this.draining = this.runDrain();
    try {
      await this.draining;
    } finally {
      this.draining = null;
    }
  }

  private async runDrain(): Promise<void> {
    try {
      await this.releaseStuck();

      const due = await this.outboxRepository.find({
        where: {
          status: MailStatus.PENDING,
          nextAttemptAt: LessThanOrEqual(new Date()),
        },
        order: { id: 'ASC' },
        take: BATCH_SIZE,
      });

      for (const letter of due) {
        await this.attempt(letter);
      }
    } catch (error) {
      this.logger.error('Outbox drain failed', error as Error);
    }
  }

  private async attempt(letter: MailOutbox) {
    const transporter = this.getTransporter();
    if (!transporter) return;

    // Claim it first, conditional on it still being PENDING: two drains (or
    // two instances) racing over the same row can't both win, so nobody gets
    // the same receipt twice.
    const claim = await this.outboxRepository.update(
      { id: letter.id, status: MailStatus.PENDING },
      { status: MailStatus.SENDING, nextAttemptAt: new Date() },
    );
    if (!claim.affected) return;

    try {
      await transporter.sendMail({
        from: this.from,
        to: letter.toEmail,
        subject: letter.subject,
        text: letter.textBody,
        html: letter.htmlBody,
      });

      await this.outboxRepository.update(letter.id, {
        status: MailStatus.SENT,
        attempts: letter.attempts + 1,
        sentAt: new Date(),
        lastError: null,
      });

      this.logger.log(`Sent "${letter.subject}" to ${letter.toEmail}`);
    } catch (error) {
      await this.reschedule(letter, error);
    }
  }

  private async reschedule(letter: MailOutbox, error: unknown) {
    const attempts = letter.attempts + 1;
    const message = error instanceof Error ? error.message : String(error);
    const delay = BACKOFF_MS[attempts - 1];

    if (delay === undefined) {
      await this.outboxRepository.update(letter.id, {
        status: MailStatus.FAILED,
        attempts,
        lastError: message,
      });

      this.logger.error(
        `Giving up on "${letter.subject}" to ${letter.toEmail} after ${attempts} attempts: ${message}`,
      );

      // A receipt nobody received and nobody knows about is the worst of both
      // worlds, so a dead letter always surfaces to a human.
      this.telegramService
        .notifyAdmin(
          `❗️ Лист "${letter.subject}" не доставлено на ${letter.toEmail} після ${attempts} спроб.\nПомилка: ${message}`,
        )
        .catch(() => {});
      return;
    }

    await this.outboxRepository.update(letter.id, {
      status: MailStatus.PENDING,
      attempts,
      lastError: message,
      nextAttemptAt: new Date(Date.now() + delay),
    });

    this.logger.warn(
      `Attempt ${attempts} for "${letter.subject}" failed (${message}); retrying in ${Math.round(delay / 60_000)} min`,
    );
  }
}
