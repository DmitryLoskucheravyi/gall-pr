import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum MailStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

// What the letter is about. Kept as a column rather than inferred from the
// subject so the admin log can group and label mails without parsing prose.
export enum MailKind {
  ORDER_PLACED = 'order_placed',
  PAYMENT_PROOF_RECEIVED = 'payment_proof_received',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  PAYMENT_FAILED = 'payment_failed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_COMPLETED = 'order_completed',
  ORDER_CANCELLED = 'order_cancelled',
  // Hand-sent only: the catch-all for when something went wrong in a way no
  // status covers.
  ORDER_APOLOGY = 'order_apology',
}

// One row per letter the shop wants to send. Writing the mail down before
// trying to send it is the whole point: SMTP can be down, the process can be
// restarted mid-send, and the customer still gets their receipt — a row here
// outlives both. It doubles as the delivery log, which is why failures keep
// their error text instead of vanishing into stdout.
@Entity('mail_outbox')
@Index('idx_due', ['status', 'nextAttemptAt'])
// Asked on every automatic send, to check whether this order has already had
// this letter.
@Index('idx_order_kind', ['orderId', 'kind'])
export class MailOutbox {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  kind: MailKind;

  @Column({ name: 'to_email', type: 'varchar', length: 255 })
  toEmail: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ name: 'text_body', type: 'text' })
  textBody: string;

  @Column({ name: 'html_body', type: 'mediumtext' })
  htmlBody: string;

  // Every mail we send today is about an order; the column stays nullable so
  // a future non-order mail doesn't need a schema change.
  @Column({ name: 'order_id', type: 'int', nullable: true })
  orderId: number | null;

  @Column({ type: 'varchar', length: 16, default: MailStatus.PENDING })
  status: MailStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'next_attempt_at', type: 'datetime' })
  nextAttemptAt: Date;

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
