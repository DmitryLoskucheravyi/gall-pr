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

  // Refs only. The display names used to be sent alongside them as free
  // strings and written onto the order verbatim, while the delivery fee was
  // priced from the ref — so a client could pay for delivery to the cheapest
  // city in the country and have the parcel addressed to any other. Both names
  // are now resolved from these refs server-side.
  @IsOptional()
  @IsString()
  novaPoshtaCityRef?: string;

  @IsOptional()
  @IsString()
  novaPoshtaWarehouseRef?: string;
}
