import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateFaqItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsString()
  textEn?: string;
}

export class UpdateFaqItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  text?: string;

  @IsOptional()
  @IsString()
  textEn?: string;
}

export class ReorderFaqDto {
  // { [faqItemId]: newOrder }
  @IsObject()
  order: Record<string, number>;
}
