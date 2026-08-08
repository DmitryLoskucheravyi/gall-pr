import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { MailDispatcher } from './mail.dispatcher';
import { MailKind, MailOutbox, MailStatus } from './entities/mail-outbox.entity';

export type OrderMailItem = {
  title: string;
  quantity: number;
  price: number;
};

// `force` sends the letter even when this order has already had one of the
// same kind — the admin asking for it by hand.
export type SendOptions = { force?: boolean };

export type OrderMailData = {
  id: number;
  customerName?: string | null;
  items: OrderMailItem[];
  total: number;
  deliveryCost: number;
  codFee: number;
  deliveryPlace?: string | null;
  paymentLabel: string;
  comment?: string | null;
};

const BRAND = 'Viktorumm';
const ACCENT = '#551126';
const INK = '#1c1a16';
const MUTED = '#6d6961';
const PAPER = '#f6f4ef';

function money(value: number): string {
  return `${Number(value).toLocaleString('uk-UA')} ₴`;
}

// Customer-supplied text (names, comments, painting titles) goes into markup,
// so it can't carry markup of its own — an unclosed tag in a comment would
// swallow the rest of the letter.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Writes the shop's letters. Nothing here talks to SMTP: a rendered mail is
// handed to the outbox and MailDispatcher does the sending, so a dead SMTP
// host or a restart costs a delay rather than the letter. The transport is
// provider-agnostic (Mailtrap, Resend, Brevo, SES, any SMTP host).
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectRepository(MailOutbox)
    private readonly outboxRepository: Repository<MailOutbox>,
    private readonly dispatcher: MailDispatcher,
  ) {}

  // Has this order already had this letter? Anything queued, in flight or
  // delivered counts; a failed or skipped one does not, since nobody read it.
  private async alreadySent(
    kind: MailKind,
    orderId: number,
  ): Promise<boolean> {
    const existing = await this.outboxRepository.findOne({
      where: {
        kind,
        orderId,
        status: In([MailStatus.PENDING, MailStatus.SENDING, MailStatus.SENT]),
      },
      select: { id: true },
    });

    return existing !== null;
  }

  // Every order mail goes through here: one place that knows how a letter is
  // recorded, and that queuing must never take the caller down with it — an
  // order is placed whether or not its receipt goes out.
  //
  // Automatic sends are deduplicated per order and kind: flipping a status
  // back and forth in the admin is a normal thing to do, and the customer
  // shouldn't get the same letter each time. Sending it again is a decision
  // someone makes on purpose, which is what `force` is for.
  private async send(
    kind: MailKind,
    to: string,
    subject: string,
    text: string,
    html: string,
    orderId: number | null,
    options: SendOptions = {},
  ): Promise<void> {
    if (!options.force && orderId !== null) {
      if (await this.alreadySent(kind, orderId)) {
        this.logger.log(
          `Skipped "${subject}" for ${to} — already sent for order ${orderId}`,
        );
        return;
      }
    }

    // With no SMTP credentials there is nothing to retry against, so the
    // letter is filed as skipped rather than piling up in the queue. It still
    // lands in the log, which is what makes local runs inspectable.
    const configured = this.dispatcher.isConfigured();

    if (!configured) {
      this.logger.warn(`[MAIL NOT CONFIGURED] "${subject}" -> ${to}\n${text}`);
    }

    try {
      await this.outboxRepository.save(
        this.outboxRepository.create({
          kind,
          toEmail: to,
          subject,
          textBody: text,
          htmlBody: html,
          orderId,
          status: configured ? MailStatus.PENDING : MailStatus.SKIPPED,
          attempts: 0,
          nextAttemptAt: new Date(),
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to queue "${subject}" for ${to}`, error as Error);
      return;
    }

    // Nudge the dispatcher instead of waiting for its tick, so the ordinary
    // path is as immediate as sending inline was.
    if (configured) void this.dispatcher.drain();
  }

  // Shared shell so the mails read as one voice. Inline styles and a table-free
  // layout on purpose: mail clients strip <style> blocks and disagree about
  // everything else.
  private layout(heading: string, body: string): string {
    return `
      <div style="margin:0;padding:24px 12px;background:${PAPER};font-family:Georgia,'Times New Roman',serif;">
        <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;">
          <div style="font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:${MUTED};">${BRAND}</div>
          <h1 style="margin:12px 0 24px;font-size:23px;font-weight:normal;color:${INK};">${heading}</h1>
          ${body}
          <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e6e2d8;font-size:12px;line-height:1.6;color:${MUTED};">
            Це автоматичний лист про ваше замовлення. Якщо щось незрозуміло —
            просто відповідайте на нього, ми прочитаємо.
          </div>
        </div>
      </div>
    `;
  }

  private itemsBlock(order: OrderMailData): string {
    const rows = order.items
      .map(
        (item) => `
        <div style="display:block;padding:8px 0;border-bottom:1px solid #efece4;font-size:15px;color:${INK};">
          ${escapeHtml(item.title)} × ${item.quantity}
          <span style="float:right;">${money(item.price * item.quantity)}</span>
        </div>`,
      )
      .join('');

    const extras = [
      order.deliveryCost > 0
        ? `<div style="font-size:14px;color:${MUTED};padding:4px 0;">Доставка<span style="float:right;">${money(order.deliveryCost)}</span></div>`
        : '',
      order.codFee > 0
        ? `<div style="font-size:14px;color:${MUTED};padding:4px 0;">Комісія за накладений платіж<span style="float:right;">${money(order.codFee)}</span></div>`
        : '',
    ].join('');

    return `
      ${rows}
      <div style="padding-top:10px;">${extras}</div>
      <div style="margin-top:8px;padding-top:12px;border-top:2px solid ${INK};font-size:17px;color:${INK};">
        Разом<span style="float:right;font-weight:bold;">${money(order.total)}</span>
      </div>
    `;
  }

  private itemsText(order: OrderMailData): string {
    const lines = order.items.map(
      (item) =>
        `• ${item.title} × ${item.quantity} — ${money(item.price * item.quantity)}`,
    );
    if (order.deliveryCost > 0) {
      lines.push(`Доставка — ${money(order.deliveryCost)}`);
    }
    if (order.codFee > 0) {
      lines.push(`Комісія за накладений платіж — ${money(order.codFee)}`);
    }
    lines.push(`Разом: ${money(order.total)}`);
    return lines.join('\n');
  }

  // 1. The receipt. The one mail that can't be skipped: without it the
  // customer has no record the order exists. For a card transfer it also
  // carries the IBAN — otherwise there's nothing to pay against.
  async sendOrderPlaced(
    to: string,
    order: OrderMailData,
    cardTransferIban?: string | null,
    options: SendOptions = {},
  ): Promise<void> {
    const greeting = order.customerName
      ? `Дякуємо, ${order.customerName}!`
      : 'Дякуємо за замовлення!';

    const payBlock = cardTransferIban
      ? `
      <div style="margin:24px 0;padding:16px;background:${PAPER};">
        <div style="font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:${MUTED};">Оплата переказом на карту</div>
        <div style="margin-top:8px;font-size:17px;color:${INK};letter-spacing:.04em;">${escapeHtml(cardTransferIban)}</div>
        <div style="margin-top:8px;font-size:14px;color:${MUTED};">
          Сума до сплати: ${money(order.total)}. У призначенні вкажіть «Замовлення №${order.id}».
          Після оплати надішліть скріншот у кабінеті — ми підтвердимо.
        </div>
      </div>`
      : '';

    const body = `
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        Ми отримали ваше замовлення <strong>№${order.id}</strong> і вже беремося за нього.
      </p>
      ${this.itemsBlock(order)}
      ${payBlock}
      <div style="margin-top:20px;font-size:14px;line-height:1.7;color:${MUTED};">
        ${order.deliveryPlace ? `Доставка: ${escapeHtml(order.deliveryPlace)}<br/>` : ''}
        Оплата: ${order.paymentLabel}
        ${order.comment ? `<br/>Ваш коментар: ${escapeHtml(order.comment)}` : ''}
      </div>
    `;

    const text = [
      greeting,
      '',
      `Ми отримали замовлення №${order.id}.`,
      '',
      this.itemsText(order),
      '',
      order.deliveryPlace ? `Доставка: ${order.deliveryPlace}` : '',
      `Оплата: ${order.paymentLabel}`,
      cardTransferIban
        ? `\nПереказ на карту: ${cardTransferIban}\nСума: ${money(order.total)}\nУ призначенні вкажіть «Замовлення №${order.id}».`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    await this.send(
      MailKind.ORDER_PLACED,
      to,
      `Замовлення №${order.id} прийнято — ${BRAND}`,
      text,
      this.layout(escapeHtml(greeting), body),
      order.id,
      options,
    );
  }

  // 2. Closes the most anxious gap in the card-transfer path: money has left
  // the customer's account and nothing has acknowledged it yet.
  async sendPaymentProofReceived(
    to: string,
    orderId: number,
    options: SendOptions = {},
  ): Promise<void> {
    const heading = 'Отримали ваш переказ';
    const body = `
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        Ми побачили скріншот оплати до замовлення <strong>№${orderId}</strong> і перевіряємо надходження.
        Щойно підтвердимо — надішлемо окремий лист.
      </p>`;
    await this.send(
      MailKind.PAYMENT_PROOF_RECEIVED,
      to,
      `Скріншот оплати до замовлення №${orderId} отримано — ${BRAND}`,
      `Ми побачили скріншот оплати до замовлення №${orderId} і перевіряємо надходження. Щойно підтвердимо — напишемо.`,
      this.layout(heading, body),
      orderId,
      options,
    );
  }

  async sendPaymentConfirmed(
    to: string,
    orderId: number,
    options: SendOptions = {},
  ): Promise<void> {
    const heading = 'Оплату підтверджено';
    const body = `
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        Оплату замовлення <strong>№${orderId}</strong> зараховано. Готуємо роботу до відправки
        і повідомимо, щойно передамо її в Нову пошту.
      </p>`;
    await this.send(
      MailKind.PAYMENT_CONFIRMED,
      to,
      `Оплату замовлення №${orderId} підтверджено — ${BRAND}`,
      `Оплату замовлення №${orderId} зараховано. Готуємо роботу до відправки.`,
      this.layout(heading, body),
      orderId,
      options,
    );
  }

  // Says what went wrong and what to do — a bare "payment failed" is just
  // anxiety with no way out of it.
  async sendPaymentFailed(
    to: string,
    orderId: number,
    options: SendOptions = {},
  ): Promise<void> {
    const heading = 'Оплата не пройшла';
    const body = `
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        Оплата замовлення <strong>№${orderId}</strong> не підтвердилася. Гроші, якщо вони списалися,
        повернуться на картку автоматично протягом кількох робочих днів.
      </p>
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        Саме замовлення ми поки тримаємо за вами. Спробуйте оплатити ще раз у кабінеті
        або відповідайте на цей лист — розберемося разом.
      </p>`;
    await this.send(
      MailKind.PAYMENT_FAILED,
      to,
      `Оплата замовлення №${orderId} не пройшла — ${BRAND}`,
      `Оплата замовлення №${orderId} не підтвердилася. Замовлення тримаємо за вами — спробуйте ще раз або напишіть нам.`,
      this.layout(heading, body),
      orderId,
      options,
    );
  }

  // 3. The second most useful mail after the receipt — but only because it
  // carries the waybill. Without a number there is nothing to track.
  async sendOrderShipped(
    to: string,
    orderId: number,
    trackingNumber: string,
    deliveryPlace?: string | null,
    options: SendOptions = {},
  ): Promise<void> {
    const heading = 'Замовлення відправлено';
    const body = `
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        Замовлення <strong>№${orderId}</strong> передано в Нову пошту.
      </p>
      <div style="margin:24px 0;padding:16px;background:${PAPER};">
        <div style="font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:${MUTED};">Номер накладної</div>
        <div style="margin-top:8px;font-size:21px;letter-spacing:.06em;color:${ACCENT};">${escapeHtml(trackingNumber)}</div>
        ${deliveryPlace ? `<div style="margin-top:10px;font-size:14px;color:${MUTED};">Куди: ${escapeHtml(deliveryPlace)}</div>` : ''}
      </div>
      <p style="font-size:14px;line-height:1.7;color:${MUTED};">
        Відстежити рух посилки можна за цим номером на сайті або в застосунку Нової пошти.
      </p>`;
    await this.send(
      MailKind.ORDER_SHIPPED,
      to,
      `Замовлення №${orderId} відправлено — ${BRAND}`,
      `Замовлення №${orderId} передано в Нову пошту.\nНомер накладної: ${trackingNumber}${deliveryPlace ? `\nКуди: ${deliveryPlace}` : ''}`,
      this.layout(heading, body),
      orderId,
      options,
    );
  }

  // 4. The last word. A bare "thank you" would be noise, so this one earns
  // its place by naming the work — the only mail where that's the point, not
  // an order number — and by saying how to keep it in one piece.
  async sendOrderCompleted(
    to: string,
    order: OrderMailData,
    options: SendOptions = {},
  ): Promise<void> {
    const heading = order.customerName
      ? `Дякуємо, ${order.customerName}!`
      : 'Дякуємо!';

    const titles = order.items.map((item) => `«${item.title}»`);
    const worksLine =
      titles.length === 1
        ? `${titles[0]} тепер ваша.`
        : `Тепер ваші: ${titles.join(', ')}.`;

    const care = [
      'подалі від прямого сонця — воно з часом змінює кольори;',
      'не над батареєю і не у вологій кімнаті;',
      'пил — сухою мʼякою тканиною, без води й засобів.',
    ];

    const body = `
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        ${escapeHtml(worksLine)} Для нас це не просто замовлення №${order.id} —
        кожна робота пишеться в одному екземплярі, і ми раді, що ця знайшла свою стіну.
      </p>
      <div style="margin:24px 0;padding:16px;background:${PAPER};">
        <div style="font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:${MUTED};">Щоб робота лишалася такою ж</div>
        <div style="margin-top:10px;font-size:14px;line-height:1.9;color:${INK};">
          ${care.map((line) => `• ${line}`).join('<br/>')}
        </div>
      </div>
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        Якщо надішлете фото роботи на стіні — нам буде дуже приємно побачити. І якщо
        виникне будь-яке питання про картину, просто відповідайте на цей лист.
      </p>`;

    const text = [
      heading,
      '',
      `${worksLine} Кожна робота пишеться в одному екземплярі, і ми раді, що ця знайшла свою стіну.`,
      '',
      'Щоб робота лишалася такою ж:',
      ...care.map((line) => `• ${line}`),
      '',
      'Надішлете фото роботи на стіні — нам буде дуже приємно побачити. Питання про картину — просто відповідайте на цей лист.',
    ].join('\n');

    await this.send(
      MailKind.ORDER_COMPLETED,
      to,
      `Дякуємо за замовлення №${order.id} — ${BRAND}`,
      text,
      this.layout(escapeHtml(heading), body),
      order.id,
      options,
    );
  }

  // Every painting is one of a kind, so a cancellation means that exact work
  // goes back up for sale — worth saying plainly.
  async sendOrderCancelled(
    to: string,
    orderId: number,
    options: SendOptions = {},
  ): Promise<void> {
    const heading = 'Замовлення скасовано';
    const body = `
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        Замовлення <strong>№${orderId}</strong> скасовано, роботи з нього знову доступні в каталозі.
      </p>
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        Якщо оплата вже пройшла, ми повернемо кошти тим самим способом. Якщо скасування —
        непорозуміння, відповідайте на цей лист, і ми все відновимо.
      </p>`;
    await this.send(
      MailKind.ORDER_CANCELLED,
      to,
      `Замовлення №${orderId} скасовано — ${BRAND}`,
      `Замовлення №${orderId} скасовано, роботи знову доступні в каталозі. Якщо оплата пройшла — повернемо кошти. Питання — відповідайте на цей лист.`,
      this.layout(heading, body),
      orderId,
      options,
    );
  }

  // The letter for everything the statuses don't cover: a wrong price, a
  // duplicate charge, a work that turned out to be gone. It deliberately
  // promises only a human — inventing details here would make things worse —
  // and is never sent automatically, so it always goes out on purpose.
  async sendOrderApology(to: string, orderId: number): Promise<void> {
    const heading = 'Вибачте — сталася помилка';
    const body = `
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        З замовленням <strong>№${orderId}</strong> сталася помилка з нашого боку. Просимо вибачення —
        ми вже розбираємося.
      </p>
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        Найближчим часом ми звʼяжемося з вами й розкажемо, що саме сталося і як це виправимо.
        Нічого робити не потрібно — якщо оплата вже пройшла, кошти в безпеці. Якщо хочете
        написати першими, просто відповідайте на цей лист.
      </p>`;

    await this.send(
      MailKind.ORDER_APOLOGY,
      to,
      `Щодо вашого замовлення №${orderId} — ${BRAND}`,
      `З замовленням №${orderId} сталася помилка з нашого боку. Просимо вибачення — ми вже розбираємося і найближчим часом звʼяжемося з вами. Якщо оплата пройшла, кошти в безпеці. Питання — відповідайте на цей лист.`,
      this.layout(heading, body),
      orderId,
      // Always by hand, and sometimes twice — never deduplicated.
      { force: true },
    );
  }

  // The admin-facing side of the outbox: what went out, what didn't, and why.
  // Bodies are heavy and never shown in the list, so they're left behind here
  // and fetched one letter at a time.
  async listOutbox(status?: MailStatus): Promise<MailOutbox[]> {
    return this.outboxRepository.find({
      where: status ? { status } : {},
      select: {
        id: true,
        kind: true,
        toEmail: true,
        subject: true,
        orderId: true,
        status: true,
        attempts: true,
        lastError: true,
        nextAttemptAt: true,
        sentAt: true,
        createdAt: true,
      },
      order: { id: 'DESC' },
      take: 200,
    });
  }

  async findOutboxLetter(id: number): Promise<MailOutbox> {
    const letter = await this.outboxRepository.findOne({ where: { id } });

    if (!letter) {
      throw new NotFoundException('Letter not found');
    }

    return letter;
  }

  // Manual "send it again": for a dead letter after the cause is fixed, and
  // for anything queued while SMTP was still unconfigured. The attempt count
  // resets so the retry gets a full backoff cycle rather than one last shot.
  async retryOutboxLetter(id: number): Promise<MailOutbox> {
    const letter = await this.findOutboxLetter(id);

    if (letter.status === MailStatus.SENDING) {
      return letter;
    }

    await this.outboxRepository.update(letter.id, {
      status: MailStatus.PENDING,
      attempts: 0,
      lastError: null,
      sentAt: null,
      nextAttemptAt: new Date(),
    });

    void this.dispatcher.drain();

    return this.findOutboxLetter(id);
  }

  // Housekeeping for the log screen: clears out what has already arrived and
  // needs no further attention, leaving anything still in flight or broken.
  async clearSettledLetters(): Promise<{ removed: number }> {
    const result = await this.outboxRepository.delete({
      status: In([MailStatus.SENT, MailStatus.SKIPPED]),
    });

    return { removed: result.affected ?? 0 };
  }
}
