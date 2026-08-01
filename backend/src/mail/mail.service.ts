import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// Provider-agnostic mailer over SMTP (works with Mailtrap, Resend, Brevo, SES,
// any SMTP host). If SMTP isn't configured, it logs the message instead of
// sending — so the whole verification flow is testable locally with no account.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !port || !user || !pass) return null;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return this.transporter;
  }

  private get from(): string {
    return process.env.SMTP_FROM || 'Viktorumm <no-reply@viktorumm.local>';
  }

  async sendVerificationCode(
    email: string,
    code: string,
    firstName?: string,
  ): Promise<void> {
    const greeting = firstName ? `Вітаємо, ${firstName}!` : 'Вітаємо!';
    const subject = 'Код підтвердження — Viktorumm';
    const text = `${greeting}\n\nВаш код підтвердження: ${code}\nКод дійсний 15 хвилин.\n\nЯкщо ви не реєструвались — просто проігноруйте цей лист.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1c1a16;">
        <h2 style="font-weight: 600;">${greeting}</h2>
        <p>Ваш код підтвердження облікового запису:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; margin: 24px 0; color: #551126;">${code}</p>
        <p style="color: #6d6961;">Код дійсний 15 хвилин. Якщо ви не реєструвались — просто проігноруйте цей лист.</p>
      </div>
    `;

    const transporter = this.getTransporter();

    if (!transporter) {
      // Dev fallback: no SMTP configured — surface the code in the logs so the
      // flow can be tested without an email provider.
      this.logger.warn(
        `[MAIL NOT CONFIGURED] Verification code for ${email}: ${code}`,
      );
      return;
    }

    await transporter.sendMail({ from: this.from, to: email, subject, text, html });
    this.logger.log(`Verification code sent to ${email}`);
  }
}
