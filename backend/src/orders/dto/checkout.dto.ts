import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

import { DeliveryMethod, PaymentProvider } from '../entities/order.entity';

// What a customer may actually choose at checkout.
//
// ON_AGREEMENT is deliberately absent: it means "the price is still being
// settled between the artist and the customer", which is only true of a
// commission. Accepting it here let anyone place an ordinary order for a real
// painting that owed nothing and had no way to be paid — the enum was the only
// thing gating it, and the enum included it.
export const CHECKOUT_PAYMENT_PROVIDERS = [
  PaymentProvider.LIQPAY,
  PaymentProvider.WAYFORPAY,
  PaymentProvider.CASH_ON_DELIVERY,
  PaymentProvider.CARD_TRANSFER,
] as const;

// Every string here lands in a sized column. Without a ceiling, an over-long
// value is a driver error — a 500 — rather than the 400 it should be, and the
// guest fields are reachable without an account.
export class CheckoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  guestName?: string;

  // Guests are told about their order by email and nothing else, so this is
  // the one contact field that can't be skipped. The service checks it too,
  // since it only applies when there's no account.
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  guestEmail?: string;

  @IsOptional()
  @IsString()
  @Length(6, 50)
  guestPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  guestAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsIn(CHECKOUT_PAYMENT_PROVIDERS as readonly PaymentProvider[])
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
  //
  // Nova Poshta refs are UUIDs; bounding them keeps a megabyte of text from
  // reaching the upstream API on our key.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  novaPoshtaCityRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  novaPoshtaWarehouseRef?: string;
}
