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

// A letter before it is sent: what the admin's preview shows. The same
// template and data the send would use.
export type ComposedLetter = {
  kind: MailKind;
  to: string;
  subject: string;
  text: string;
  html: string;
};

// The admin's edits from that preview. Absent fields keep the template's.
export type MailEdits = { subject?: string; html?: string };

export type MailLetter = MailLogEntry & {
  textBody: string;
  htmlBody: string;
};
