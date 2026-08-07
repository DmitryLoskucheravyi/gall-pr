import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export type OrderMailItem = {
  title: string;
  quantity: number;
  price: number;
};

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

// Provider-agnostic mailer over SMTP (works with Mailtrap, Resend, Brevo, SES,
// any SMTP host). If SMTP isn't configured it logs the message instead of
// sending, so the whole order flow stays testable locally with no account.
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

  // Every order mail goes through here: one place that knows the transport,
  // the dev fallback, and that a failure must never take the caller down with
  // it — an order is placed whether or not its receipt goes out.
  private async send(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn(`[MAIL NOT CONFIGURED] "${subject}" -> ${to}\n${text}`);
      return;
    }

    try {
      await transporter.sendMail({ from: this.from, to, subject, text, html });
      this.logger.log(`Sent "${subject}" to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send "${subject}" to ${to}`, error as Error);
    }
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
          ${item.title} × ${item.quantity}
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
  ): Promise<void> {
    const greeting = order.customerName
      ? `Дякуємо, ${order.customerName}!`
      : 'Дякуємо за замовлення!';

    const payBlock = cardTransferIban
      ? `
      <div style="margin:24px 0;padding:16px;background:${PAPER};">
        <div style="font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:${MUTED};">Оплата переказом на карту</div>
        <div style="margin-top:8px;font-size:17px;color:${INK};letter-spacing:.04em;">${cardTransferIban}</div>
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
        ${order.deliveryPlace ? `Доставка: ${order.deliveryPlace}<br/>` : ''}
        Оплата: ${order.paymentLabel}
        ${order.comment ? `<br/>Ваш коментар: ${order.comment}` : ''}
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
      to,
      `Замовлення №${order.id} прийнято — ${BRAND}`,
      text,
      this.layout(greeting, body),
    );
  }

  // 2. Closes the most anxious gap in the card-transfer path: money has left
  // the customer's account and nothing has acknowledged it yet.
  async sendPaymentProofReceived(to: string, orderId: number): Promise<void> {
    const heading = 'Отримали ваш переказ';
    const body = `
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        Ми побачили скріншот оплати до замовлення <strong>№${orderId}</strong> і перевіряємо надходження.
        Щойно підтвердимо — надішлемо окремий лист.
      </p>`;
    await this.send(
      to,
      `Скріншот оплати до замовлення №${orderId} отримано — ${BRAND}`,
      `Ми побачили скріншот оплати до замовлення №${orderId} і перевіряємо надходження. Щойно підтвердимо — напишемо.`,
      this.layout(heading, body),
    );
  }

  async sendPaymentConfirmed(to: string, orderId: number): Promise<void> {
    const heading = 'Оплату підтверджено';
    const body = `
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        Оплату замовлення <strong>№${orderId}</strong> зараховано. Готуємо роботу до відправки
        і повідомимо, щойно передамо її в Нову пошту.
      </p>`;
    await this.send(
      to,
      `Оплату замовлення №${orderId} підтверджено — ${BRAND}`,
      `Оплату замовлення №${orderId} зараховано. Готуємо роботу до відправки.`,
      this.layout(heading, body),
    );
  }

  // Says what went wrong and what to do — a bare "payment failed" is just
  // anxiety with no way out of it.
  async sendPaymentFailed(to: string, orderId: number): Promise<void> {
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
      to,
      `Оплата замовлення №${orderId} не пройшла — ${BRAND}`,
      `Оплата замовлення №${orderId} не підтвердилася. Замовлення тримаємо за вами — спробуйте ще раз або напишіть нам.`,
      this.layout(heading, body),
    );
  }

  // 3. The second most useful mail after the receipt — but only because it
  // carries the waybill. Without a number there is nothing to track.
  async sendOrderShipped(
    to: string,
    orderId: number,
    trackingNumber: string,
    deliveryPlace?: string | null,
  ): Promise<void> {
    const heading = 'Замовлення відправлено';
    const body = `
      <p style="font-size:15px;line-height:1.7;color:${INK};">
        Замовлення <strong>№${orderId}</strong> передано в Нову пошту.
      </p>
      <div style="margin:24px 0;padding:16px;background:${PAPER};">
        <div style="font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:${MUTED};">Номер накладної</div>
        <div style="margin-top:8px;font-size:21px;letter-spacing:.06em;color:${ACCENT};">${trackingNumber}</div>
        ${deliveryPlace ? `<div style="margin-top:10px;font-size:14px;color:${MUTED};">Куди: ${deliveryPlace}</div>` : ''}
      </div>
      <p style="font-size:14px;line-height:1.7;color:${MUTED};">
        Відстежити рух посилки можна за цим номером на сайті або в застосунку Нової пошти.
      </p>`;
    await this.send(
      to,
      `Замовлення №${orderId} відправлено — ${BRAND}`,
      `Замовлення №${orderId} передано в Нову пошту.\nНомер накладної: ${trackingNumber}${deliveryPlace ? `\nКуди: ${deliveryPlace}` : ''}`,
      this.layout(heading, body),
    );
  }

  // Every painting is one of a kind, so a cancellation means that exact work
  // goes back up for sale — worth saying plainly.
  async sendOrderCancelled(to: string, orderId: number): Promise<void> {
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
      to,
      `Замовлення №${orderId} скасовано — ${BRAND}`,
      `Замовлення №${orderId} скасовано, роботи знову доступні в каталозі. Якщо оплата пройшла — повернемо кошти. Питання — відповідайте на цей лист.`,
      this.layout(heading, body),
    );
  }
}
