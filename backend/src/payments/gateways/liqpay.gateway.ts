import { Injectable } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';

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
  //
  // Takes the key as an argument rather than reading the getter, so an unset
  // key can't quietly become the string "undefined" — which is a signing key an
  // attacker knows as well as we do.
  private sign(data: string, privateKey: string): string {
    return createHash('sha1')
      .update(privateKey + data + privateKey)
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
    const signature = this.sign(data, this.privateKey!);

    return { actionUrl: CHECKOUT_URL, fields: { data, signature } };
  }

  verifyCallback(
    payload: Record<string, unknown>,
  ): PaymentCallbackResult | null {
    const privateKey = this.privateKey;

    // Without a key there is no signature to check, so there is no such thing
    // as a callback we can believe.
    if (!privateKey) {
      return null;
    }

    const data = payload.data;
    const signature = payload.signature;

    if (typeof data !== 'string' || typeof signature !== 'string') {
      return null;
    }

    if (!signaturesMatch(this.sign(data, privateKey), signature)) {
      return null;
    }

    // The signature is ours, but the body is still whatever arrived over the
    // wire — malformed JSON or a missing order_id must be a rejected callback,
    // not a 500.
    let decoded: {
      order_id?: unknown;
      payment_id?: unknown;
      status?: unknown;
      amount?: unknown;
      currency?: unknown;
    };

    try {
      // JSON.parse is typed `any`; the shape above is what we intend to read
      // out of it, and every field is `unknown` until it has been checked.
      decoded = JSON.parse(
        Buffer.from(data, 'base64').toString(),
      ) as typeof decoded;
    } catch {
      return null;
    }

    if (typeof decoded.order_id !== 'string') {
      return null;
    }

    const orderId = Number(decoded.order_id.replace('order-', ''));

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return null;
    }

    const amount = Number(decoded.amount);

    // Read, not coerced: String() on whatever arrived would happily turn an
    // object into "[object Object]" and record that as the payment's id.
    const paymentId = decoded.payment_id;

    return {
      orderId,
      transactionId:
        typeof paymentId === 'string' || typeof paymentId === 'number'
          ? String(paymentId)
          : '',
      success: decoded.status === 'success' || decoded.status === 'sandbox',
      amount: Number.isFinite(amount) ? amount : null,
      currency: typeof decoded.currency === 'string' ? decoded.currency : null,
    };
  }
}

// Constant-time comparison so a forger can't learn the expected signature one
// byte at a time from response-timing differences.
function signaturesMatch(expected: string, received: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);

  return left.length === right.length && timingSafeEqual(left, right);
}
