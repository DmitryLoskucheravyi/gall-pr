import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateNewsDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  textEn?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  // The whole gallery, in order. Capped so a runaway form cannot write a row
  // nobody will ever scroll through.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  gallery?: string[];
}
