import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Painting } from '../paintings/entities/painting.entity';
import { PaymentsModule } from '../payments/payments.module';
import { NovaPoshtaModule } from '../nova-poshta/nova-poshta.module';
import { UsersModule } from '../users/users.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, CartItem, Painting]),
    PaymentsModule,
    NovaPoshtaModule,
    UsersModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
