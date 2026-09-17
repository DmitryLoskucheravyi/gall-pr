import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// FAQ entries live in a JSON column, which imposes no shape of its own — so
// every bound on what can go in there has to be here.
const TITLE_MAX = 300;
const TEXT_MAX = 5000;

export class CreateFaqItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(TITLE_MAX)
  titleEn?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(TEXT_MAX)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  textEn?: string;
}

export class UpdateFaqItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TITLE_MAX)
  titleEn?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TEXT_MAX)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  textEn?: string;
}

// One position for one item. A plain `Record<string, number>` was accepted with
// only @IsObject(), so the values were never checked at all — a nested object
// or a string would be written straight into the FAQ's JSON column and read
// back as a sort key by the storefront.
export class FaqOrderEntryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  id: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  order: number;
}

export class ReorderFaqDto {
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => FaqOrderEntryDto)
  order: FaqOrderEntryDto[];
}
