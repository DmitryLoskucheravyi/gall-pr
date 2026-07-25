import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateGiveawayDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  conditions?: string;

  @IsInt()
  paintingId: number;

  @IsDateString()
  deadline: string;
}
