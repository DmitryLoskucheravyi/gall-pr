import { Order, PaymentProvider } from '../../orders/entities/order.entity';

export type PaymentFormFields = Record<string, string | string[]>;

export type PaymentInitResult = {
  actionUrl: string;
  fields: PaymentFormFields;
};

export type PaymentCallbackResult = {
  orderId: number;
  transactionId: string;
  success: boolean;
  // What the gateway says was actually paid, in UAH. A valid signature only
  // proves the message came from the gateway — not that it settles this order,
  // so PaymentsService reconciles this against the order total before marking
  // anything PAID.
  amount: number | null;
  currency: string | null;
};

export interface PaymentGateway {
  readonly provider: PaymentProvider;
  isConfigured(): boolean;
  createPayment(order: Order): PaymentInitResult;
  verifyCallback(payload: Record<string, unknown>): PaymentCallbackResult | null;
  buildCallbackAck?(payload: Record<string, unknown>): Record<string, unknown>;
}
