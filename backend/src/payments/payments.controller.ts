import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { PaymentProvider } from '../orders/entities/order.entity';
import { PaymentsService } from './payments.service';

// Unauthenticated by necessity — a payment gateway has no bearer token, only a
// signature over the body. Metered anyway: a signature check is cheap, but an
// unbounded stream of forged callbacks is still a database lookup each, and
// the throttler's default bucket is sized for a browsing customer rather than
// for a gateway retrying.
@Throttle({ default: { ttl: 60_000, limit: 60 } })
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Public: the cart needs to know whether card payment can be offered at
  // all. Everything manual (cash on delivery, card transfer) is always
  // available and lives in the client; this is only the gateways.
  @Get('methods')
  availableMethods() {
    return { online: this.paymentsService.availableProviders() };
  }

  @Post('liqpay/callback')
  async liqpayCallback(@Body() body: Record<string, unknown>) {
    await this.paymentsService.handleCallback(PaymentProvider.LIQPAY, body);
    return { status: 'ok' };
  }

  @Post('wayforpay/callback')
  async wayforpayCallback(@Body() body: Record<string, unknown>) {
    const ack = await this.paymentsService.handleCallback(
      PaymentProvider.WAYFORPAY,
      body,
    );
    return ack ?? { status: 'ok' };
  }
}
