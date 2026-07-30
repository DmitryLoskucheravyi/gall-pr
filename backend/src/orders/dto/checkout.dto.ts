import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

import { DeliveryMethod, PaymentProvider } from '../entities/order.entity';

export class CheckoutDto {
  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;

  @IsOptional()
  @IsString()
  guestAddress?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsEnum(PaymentProvider)
  paymentProvider: PaymentProvider;

  @IsEnum(DeliveryMethod)
  deliveryMethod: DeliveryMethod;

  @IsOptional()
  @IsBoolean()
  callMeRequested?: boolean;

  @IsOptional()
  @IsString()
  novaPoshtaCity?: string;

  @IsOptional()
  @IsString()
  novaPoshtaWarehouse?: string;
}
