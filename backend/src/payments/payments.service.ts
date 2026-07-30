import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Order, PaymentProvider, PaymentStatus } from '../orders/entities/order.entity';
import { LiqPayGateway } from './gateways/liqpay.gateway';
import { WayForPayGateway } from './gateways/wayforpay.gateway';
import type { PaymentGateway, PaymentInitResult } from './gateways/payment-gateway.interface';

@Injectable()
export class PaymentsService {
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

    const result = gateway.verifyCallback(payload);

    if (result) {
      await this.ordersRepository.update(
        { id: result.orderId, paymentProvider: provider },
        {
          paymentStatus: result.success ? PaymentStatus.PAID : PaymentStatus.FAILED,
          paymentTransactionId: result.transactionId,
        },
      );
    }

    return gateway.buildCallbackAck?.(payload) ?? null;
  }
}
