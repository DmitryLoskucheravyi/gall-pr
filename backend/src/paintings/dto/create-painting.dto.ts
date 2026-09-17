import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Two is the fewest that reads as a sequence rather than a stray photo; six is
// where an auto-advancing carousel stops being something anyone sits through.
export const INTERIOR_IMAGES_MIN = 2;
export const INTERIOR_IMAGES_MAX = 6;

// A catalogue page shows a handful of shots of one painting. Anything past this
// is a mistake or a paste, and the column is JSON — nothing else bounds it.
export const IMAGES_MAX = 12;

// price is DECIMAL(10,2): eight digits before the point. A larger number is a
// driver error on insert rather than a validation failure, so the ceiling
// belongs here where it can be answered with a 400.
export const PRICE_MAX = 99_999_999;

// The URL columns are varchar(500).
const URL_MAX = 500;

export class CreatePaintingDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitleEn?: string;

  @IsString()
  @MaxLength(URL_MAX)
  cardImage: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(URL_MAX, { each: true })
  @ArrayMaxSize(IMAGES_MAX)
  images: string[];

  // Photographs of the work in a room. The 2..6 rule isn't expressible here
  // without also rejecting the empty array that means "no interior section",
  // so the count is checked in PaintingsService; this only guarantees the
  // shape and an upper bound.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(URL_MAX, { each: true })
  @ArrayMaxSize(INTERIOR_IMAGES_MAX)
  interiorImages?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(URL_MAX)
  animation3dImage?: string;

  @IsNumber()
  @Min(0)
  @Max(PRICE_MAX)
  price: number;

  // How many copies exist.
  //
  // This used to be absent from the DTO and hard-coded to 1 in the service,
  // with `whitelist: true` stripping it if sent — so there was no way to list
  // an edition of more than one, and no way to restock a work that sold out.
  // The only thing that ever raised `amount` again was cancelling a customer's
  // order.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  amount?: number;

  // Whether the work is on sale at all. Also previously unsettable, which meant
  // a painting could not be withdrawn from the catalogue or put back into it.
  // The service keeps the two honest with each other: nothing with amount 0 is
  // available, whatever this says.
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  // One of a kind unless the admin says otherwise — the safer default for a
  // gallery, since promising a repeat that isn't on offer is worse than not
  // mentioning one that is.
  @IsOptional()
  @IsBoolean()
  isRepeatable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  techniqueId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  materialId?: number;

  // The series this work belongs to, if any. Null clears it — a painting can
  // leave a series without being deleted from it on the series' own screen.
  @IsOptional()
  @IsInt()
  @Min(1)
  seriesId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2200)
  year?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(9999)
  weight?: number;

  @IsString()
  @MaxLength(20_000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  descriptionEn?: string;
}
