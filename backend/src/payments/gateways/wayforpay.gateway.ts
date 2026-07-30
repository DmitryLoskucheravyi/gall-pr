import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';

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
    return createHmac('md5', this.secretKey!).update(fields.join(';')).digest('hex');
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

  verifyCallback(payload: Record<string, unknown>): PaymentCallbackResult | null {
    const {
      orderReference,
      amount,
      currency,
      authCode,
      cardPan,
      transactionStatus,
      reasonCode,
      merchantSignature,
    } = payload as Record<string, string>;

    if (!orderReference || !merchantSignature) {
      return null;
    }

    const expected = this.hmacMd5([
      this.merchantAccount!,
      orderReference,
      amount ?? '',
      currency ?? '',
      authCode ?? '',
      cardPan ?? '',
      transactionStatus ?? '',
      reasonCode ?? '',
    ]);

    if (expected !== merchantSignature) {
      return null;
    }

    const orderId = Number(orderReference.replace('order-', ''));

    if (!orderId) {
      return null;
    }

    return {
      orderId,
      transactionId: orderReference,
      success: transactionStatus === 'Approved',
    };
  }

  buildCallbackAck(payload: Record<string, unknown>): Record<string, unknown> {
    const orderReference = String(payload.orderReference ?? '');
    const time = Math.floor(Date.now() / 1000);
    const signature = this.hmacMd5([orderReference, 'accept', time]);

    return { orderReference, status: 'accept', time, signature };
  }
}
