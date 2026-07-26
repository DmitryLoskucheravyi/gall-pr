import { IsBooleanString, IsNumberString, IsOptional } from 'class-validator';

export class GetPaintingsDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsNumberString()
  techniqueId?: string;

  @IsOptional()
  @IsBooleanString()
  isAvailable?: string;

  @IsOptional()
  @IsNumberString()
  minPrice?: string;

  @IsOptional()
  @IsNumberString()
  maxPrice?: string;
}
