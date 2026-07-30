import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from '../orders/entities/order.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { LiqPayGateway } from './gateways/liqpay.gateway';
import { WayForPayGateway } from './gateways/wayforpay.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  providers: [PaymentsService, LiqPayGateway, WayForPayGateway],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
