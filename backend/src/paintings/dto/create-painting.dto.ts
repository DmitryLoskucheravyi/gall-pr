import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// Two is the fewest that reads as a sequence rather than a stray photo; six is
// where an auto-advancing carousel stops being something anyone sits through.
export const INTERIOR_IMAGES_MIN = 2;
export const INTERIOR_IMAGES_MAX = 6;

export class CreatePaintingDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsString()
  cardImage: string;

  @IsArray()
  images: string[];

  // Photographs of the work in a room. The 2..6 rule isn't expressible here
  // without also rejecting the empty array that means "no interior section",
  // so the count is checked in PaintingsService; this only guarantees the
  // shape and an upper bound.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(INTERIOR_IMAGES_MAX)
  interiorImages?: string[];

  @IsOptional()
  @IsString()
  animation3dImage?: string;

  @IsNumber()
  @Min(0)
  price: number;

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
  techniqueId?: number;

  @IsOptional()
  @IsInt()
  materialId?: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  weight?: number;

  @IsString()
  description: string;
}
