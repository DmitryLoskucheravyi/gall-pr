import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

import { DeliveryMethod, PaymentProvider } from '../entities/order.entity';

export class CheckoutDto {
  @IsOptional()
  @IsString()
  guestName?: string;

  // Guests are told about their order by email and nothing else, so this is
  // the one contact field that can't be skipped. The service checks it too,
  // since it only applies when there's no account.
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

  @IsOptional()
  @IsString()
  novaPoshtaCityRef?: string;
}
