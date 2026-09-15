import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateGiveawayDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  conditions?: string;

  @IsOptional()
  @IsString()
  conditionsEn?: string;

  @IsInt()
  paintingId: number;

  @IsDateString()
  deadline: string;
}
