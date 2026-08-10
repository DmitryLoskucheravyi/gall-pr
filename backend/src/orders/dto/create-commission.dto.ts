import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// A request to have a sold-out work painted again.
//
// Nothing here comes from a cart: the customer is looking at one painting and
// asking for that one, so the painting is named directly. Contact details are
// always required, including from signed-in customers — a commission is a
// conversation, and the artist needs to know who to have it with even if the
// account's details are stale.
export class CreateCommissionDto {
  @IsInt()
  paintingId: number;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(32)
  phone: string;

  // Where it should eventually go. Refs rather than names, for the same
  // reason checkout takes refs: the address written down is resolved from
  // Nova Poshta, never from a string the client typed.
  @IsOptional()
  @IsString()
  novaPoshtaCityRef?: string;

  @IsOptional()
  @IsString()
  novaPoshtaWarehouseRef?: string;

  // What they want different, if anything — a size, a palette, a deadline.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
