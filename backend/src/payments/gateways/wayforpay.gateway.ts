import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

import { Order, PaymentProvider } from '../../orders/entities/order.entity';
import type {
  PaymentCallbackResult,
  PaymentGateway,
  PaymentInitResult,
} from './payment-gateway.interface';

const PURCHASE_URL = 'https://secure.wayforpay.com/pay';

@Injectable()
export class WayForPayGateway implements PaymentGateway {
  readonly provider = PaymentProvider.WAYFORPAY;

  private get merchantAccount() {
    return process.env.WAYFORPAY_MERCHANT_ACCOUNT;
  }

  private get secretKey() {
    return process.env.WAYFORPAY_SECRET_KEY;
  }

  private get domainName() {
    return process.env.WAYFORPAY_DOMAIN;
  }

  isConfigured(): boolean {
    return !!this.merchantAccount && !!this.secretKey && !!this.domainName;
  }

  private hmacMd5(fields: (string | number)[]): string {
    return createHmac('md5', this.secretKey!)
      .update(fields.join(';'))
      .digest('hex');
  }

  createPayment(order: Order): PaymentInitResult {
    const orderReference = `order-${order.id}`;
    const orderDate = Math.floor(Date.now() / 1000);
    const amount = Number(order.total);
    const currency = 'UAH';
    const productName = `Замовлення №${order.id}`;
    const productCount = 1;
    const productPrice = amount;

    // WayForPay's documented signature field order for the purchase form —
    // verify against the merchant dashboard docs if it ever stops matching.
    const signature = this.hmacMd5([
      this.merchantAccount!,
      this.domainName!,
      orderReference,
      orderDate,
      amount,
      currency,
      productName,
      productCount,
      productPrice,
    ]);

    return {
      actionUrl: PURCHASE_URL,
      fields: {
        merchantAccount: this.merchantAccount!,
        merchantDomainName: this.domainName!,
        merchantSignature: signature,
        orderReference,
        orderDate: String(orderDate),
        amount: String(amount),
        currency,
        'productName[]': [productName],
        'productCount[]': [String(productCount)],
        'productPrice[]': [String(productPrice)],
        serviceUrl: `${process.env.PAYMENTS_CALLBACK_URL}/payments/wayforpay/callback`,
        returnUrl: `${process.env.WEB_URL}/orders`,
      },
    };
  }

  verifyCallback(
    payload: Record<string, unknown>,
  ): PaymentCallbackResult | null {
    // No secret, no verifiable callback — see the same guard in LiqPayGateway.
    if (!this.isConfigured()) {
      return null;
    }

    // Read one field at a time rather than destructuring a blanket
    // `as Record<string, string>`: the body is whatever arrived over the wire,
    // and a repeated query parameter arrives as an array. Casting the lot and
    // then joining arrays into the signature string is how a forged callback
    // gets a second shape to try.
    const field = (name: string): string => {
      const value = payload[name];
      return typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : '';
    };

    const orderReference = field('orderReference');
    const amount = field('amount');
    const currency = field('currency');
    const authCode = field('authCode');
    const cardPan = field('cardPan');
    const transactionStatus = field('transactionStatus');
    const reasonCode = field('reasonCode');
    const merchantSignature = field('merchantSignature');

    if (!orderReference || !merchantSignature) {
      return null;
    }

    const expected = this.hmacMd5([
      this.merchantAccount!,
      orderReference,
      amount,
      currency,
      authCode,
      cardPan,
      transactionStatus,
      reasonCode,
    ]);

    if (!signaturesMatch(expected, merchantSignature)) {
      return null;
    }

    const orderId = Number(orderReference.replace('order-', ''));

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return null;
    }

    const paidAmount = Number(amount);

    // The identifier of the *payment*, not of the order.
    //
    // This used to be `orderReference` — i.e. "order-42", the same value on
    // every callback for that order. PaymentsService treats a repeat of the
    // same (order, transaction) pair as a settled duplicate and ignores it, so
    // with the order reference standing in for a transaction id every later
    // callback on a paid order was discarded: a refund or a reversal could
    // never be recorded. It also left nothing in the database to reconcile
    // against the acquirer's own statement.
    //
    // WayForPay identifies the transaction by authCode, falling back to the
    // reference only when the gateway sent none (a decline usually has no auth
    // code) so the field is never empty.
    const transactionId = authCode
      ? `wfp-${authCode}`
      : `${orderReference}-${transactionStatus || 'unknown'}`;

    return {
      orderId,
      transactionId,
      success: transactionStatus === 'Approved',
      amount: Number.isFinite(paidAmount) ? paidAmount : null,
      currency: currency || null,
    };
  }

  buildCallbackAck(payload: Record<string, unknown>): Record<string, unknown> {
    // Read, not coerced. String() on whatever arrived would happily turn an
    // object into "[object Object]" and sign that as the acknowledged order.
    const raw = payload.orderReference;
    const orderReference =
      typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
    const time = Math.floor(Date.now() / 1000);
    const signature = this.hmacMd5([orderReference, 'accept', time]);

    return { orderReference, status: 'accept', time, signature };
  }
}

// Constant-time comparison — see the note in LiqPayGateway.
function signaturesMatch(expected: string, received: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);

  return left.length === right.length && timingSafeEqual(left, right);
}
