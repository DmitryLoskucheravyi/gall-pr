import { IsOptional, IsString } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  nameEn?: string;
}
