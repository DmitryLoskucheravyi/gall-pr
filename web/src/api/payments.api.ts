import { api } from './client';
import type { PaymentProvider } from '../types/order.types';

class PaymentsService {
  // Which online gateways actually have keys on the server.
  //
  // LiqPay and WayForPay were fully implemented — signing, callbacks, amount
  // reconciliation — and never offered anywhere in the UI, because the cart's
  // list of payment methods was a hard-coded array of the two manual ones.
  // Asking rather than hard-coding also means a gateway with no keys is never
  // offered, which matters: choosing it would produce an order with no payment
  // form and no way to pay it.
  async availableOnline(): Promise<PaymentProvider[]> {
    const response = await api.get('/payments/methods');
    return response.data.online ?? [];
  }
}

export const paymentsService = new PaymentsService();
