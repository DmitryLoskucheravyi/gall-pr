import { Body, Controller, Post } from '@nestjs/common';

import { PaymentProvider } from '../orders/entities/order.entity';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('liqpay/callback')
  async liqpayCallback(@Body() body: Record<string, unknown>) {
    await this.paymentsService.handleCallback(PaymentProvider.LIQPAY, body);
    return { status: 'ok' };
  }

  @Post('wayforpay/callback')
  async wayforpayCallback(@Body() body: Record<string, unknown>) {
    const ack = await this.paymentsService.handleCallback(PaymentProvider.WAYFORPAY, body);
    return ack ?? { status: 'ok' };
  }
}
