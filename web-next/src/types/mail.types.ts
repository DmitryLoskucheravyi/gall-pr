export type MailStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';

export type MailKind =
  | 'order_placed'
  | 'payment_proof_received'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'order_shipped'
  | 'order_completed'
  | 'order_cancelled'
  | 'order_apology';

// What the log list shows. Bodies are deliberately absent — they're heavy and
// only fetched when a letter is actually opened.
export type MailLogEntry = {
  id: number;
  kind: MailKind;
  toEmail: string;
  subject: string;
  orderId: number | null;
  status: MailStatus;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string;
  sentAt: string | null;
  createdAt: string;
};

export type MailLetter = MailLogEntry & {
  textBody: string;
  htmlBody: string;
};
