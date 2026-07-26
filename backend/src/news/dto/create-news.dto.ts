import { IsOptional, IsString } from 'class-validator';

export class CreateNewsDto {
  @IsString()
  title: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
