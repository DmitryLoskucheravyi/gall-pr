import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Order,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from '../orders/entities/order.entity';
import { LiqPayGateway } from './gateways/liqpay.gateway';
import { WayForPayGateway } from './gateways/wayforpay.gateway';
import type { PaymentGateway, PaymentInitResult } from './gateways/payment-gateway.interface';

// Gateways report amounts in whole currency units, and the order total is a
// DECIMAL(10,2) that arrives as a string — so compare in cents, and allow a
// single cent of rounding slack rather than demanding exact float equality.
const AMOUNT_TOLERANCE_CENTS = 1;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // Not every PaymentProvider has a gateway — CASH_ON_DELIVERY/CARD_TRANSFER
  // are manual methods with no API/signature, so they're intentionally absent here.
  private readonly gateways: Partial<Record<PaymentProvider, PaymentGateway>>;

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    liqPayGateway: LiqPayGateway,
    wayForPayGateway: WayForPayGateway,
  ) {
    this.gateways = {
      [PaymentProvider.LIQPAY]: liqPayGateway,
      [PaymentProvider.WAYFORPAY]: wayForPayGateway,
    };
  }

  createPayment(order: Order): PaymentInitResult | null {
    const gateway = this.gateways[order.paymentProvider];

    if (!gateway || !gateway.isConfigured()) {
      return null;
    }

    return gateway.createPayment(order);
  }

  async handleCallback(
    provider: PaymentProvider,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    const gateway = this.gateways[provider];

    if (!gateway) {
      return null;
    }

    // An unconfigured gateway cannot verify anything, and its "signature" is
    // whatever an empty key hashes to — which is a value anybody can compute.
    // Callbacks for a provider we never handed a payment to are refused
    // outright rather than trusted by default.
    if (!gateway.isConfigured()) {
      this.logger.warn(
        `Rejected ${provider} callback: gateway is not configured, so its signature cannot be verified`,
      );
      return null;
    }

    const result = gateway.verifyCallback(payload);

    if (!result) {
      this.logger.warn(`Rejected ${provider} callback: signature did not verify`);
      return null;
    }

    const order = await this.ordersRepository.findOne({
      where: { id: result.orderId, paymentProvider: provider },
    });

    if (!order) {
      this.logger.warn(
        `Rejected ${provider} callback for order ${result.orderId}: no such order for this provider`,
      );
      return gateway.buildCallbackAck?.(payload) ?? null;
    }

    // Gateway signatures cover the payload and nothing else — no nonce, no
    // timestamp — so a callback body is replayable forever by anyone who ever
    // saw one. Settling the same transaction twice must therefore be a no-op,
    // or a captured "paid" body becomes a way to un-fail or un-refund an order
    // at will.
    if (
      order.paymentStatus === PaymentStatus.PAID &&
      order.paymentTransactionId === result.transactionId
    ) {
      this.logger.log(
        `Ignored duplicate ${provider} callback for order ${order.id}: already settled by ${result.transactionId}`,
      );
      return gateway.buildCallbackAck?.(payload) ?? null;
    }

    // A cancelled order has had its stock returned to the catalogue and may
    // well have been sold again since. Marking it paid now would be a payment
    // against something the shop no longer owes — that needs a human, not an
    // automatic status flip.
    if (order.status === OrderStatus.CANCELLED) {
      this.logger.error(
        `${provider} callback for order ${order.id} arrived after the order was cancelled — ignored, needs a human.`,
      );
      return gateway.buildCallbackAck?.(payload) ?? null;
    }

    // A valid signature proves the gateway sent this, not that it paid for
    // this order. Without reconciling the amount, a genuine 1 ₴ payment
    // settles a 50 000 ₴ order.
    if (result.success && !this.amountSettlesOrder(result, order)) {
      await this.ordersRepository.update(
        { id: order.id },
        {
          paymentStatus: PaymentStatus.FAILED,
          paymentTransactionId: result.transactionId,
        },
      );

      this.logger.error(
        `${provider} callback for order ${order.id} reports ${result.amount} ${result.currency ?? '—'} ` +
          `but the order total is ${order.total} UAH — recorded as FAILED, needs a human.`,
      );

      return gateway.buildCallbackAck?.(payload) ?? null;
    }

    await this.ordersRepository.update(
      { id: order.id },
      {
        paymentStatus: result.success ? PaymentStatus.PAID : PaymentStatus.FAILED,
        paymentTransactionId: result.transactionId,
      },
    );

    return gateway.buildCallbackAck?.(payload) ?? null;
  }

  // Everything the shop charges is priced in UAH, so a settlement in another
  // currency doesn't settle anything here regardless of the number attached.
  private amountSettlesOrder(
    result: { amount: number | null; currency: string | null },
    order: Order,
  ): boolean {
    if (result.amount === null) {
      return false;
    }

    if (result.currency !== null && result.currency !== 'UAH') {
      return false;
    }

    const paidCents = Math.round(result.amount * 100);
    const owedCents = Math.round(Number(order.total) * 100);

    return Math.abs(paidCents - owedCents) <= AMOUNT_TOLERANCE_CENTS;
  }
}
