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
};

export interface PaymentGateway {
  readonly provider: PaymentProvider;
  isConfigured(): boolean;
  createPayment(order: Order): PaymentInitResult;
  verifyCallback(payload: Record<string, unknown>): PaymentCallbackResult | null;
  buildCallbackAck?(payload: Record<string, unknown>): Record<string, unknown>;
}
