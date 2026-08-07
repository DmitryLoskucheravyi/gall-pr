import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  // Required in practice when moving to SHIPPED — the service rejects that
  // transition without it, since the customer's email is built around it.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  trackingNumber?: string;
}
