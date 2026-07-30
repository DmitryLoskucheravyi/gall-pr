import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

import { Order, PaymentProvider } from '../../orders/entities/order.entity';
import type {
  PaymentCallbackResult,
  PaymentGateway,
  PaymentInitResult,
} from './payment-gateway.interface';

const CHECKOUT_URL = 'https://www.liqpay.ua/api/3/checkout';

@Injectable()
export class LiqPayGateway implements PaymentGateway {
  readonly provider = PaymentProvider.LIQPAY;

  private get publicKey() {
    return process.env.LIQPAY_PUBLIC_KEY;
  }

  private get privateKey() {
    return process.env.LIQPAY_PRIVATE_KEY;
  }

  isConfigured(): boolean {
    return !!this.publicKey && !!this.privateKey;
  }

  // LiqPay signature scheme: base64( sha1( private_key + data + private_key ) ).
  // Same formula is used both to sign outgoing requests and to verify callbacks.
  private sign(data: string): string {
    return createHash('sha1')
      .update(this.privateKey + data + this.privateKey)
      .digest('base64');
  }

  createPayment(order: Order): PaymentInitResult {
    const payload = {
      version: 3,
      public_key: this.publicKey,
      action: 'pay',
      amount: Number(order.total),
      currency: 'UAH',
      description: `Замовлення №${order.id}`,
      order_id: `order-${order.id}`,
      result_url: `${process.env.WEB_URL}/orders`,
      server_url: `${process.env.PAYMENTS_CALLBACK_URL}/payments/liqpay/callback`,
      language: 'uk',
    };

    const data = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = this.sign(data);

    return {
      actionUrl: CHECKOUT_URL,
      fields: { data, signature },
    };
  }

  verifyCallback(payload: Record<string, unknown>): PaymentCallbackResult | null {
    const data = payload.data;
    const signature = payload.signature;

    if (typeof data !== 'string' || typeof signature !== 'string') {
      return null;
    }

    if (this.sign(data) !== signature) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(data, 'base64').toString()) as {
      order_id: string;
      payment_id: number;
      status: string;
    };

    const orderId = Number(decoded.order_id.replace('order-', ''));

    if (!orderId) {
      return null;
    }

    return {
      orderId,
      transactionId: String(decoded.payment_id),
      success: decoded.status === 'success' || decoded.status === 'sandbox',
    };
  }
}
