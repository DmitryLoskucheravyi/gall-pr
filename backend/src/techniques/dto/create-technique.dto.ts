import { IsOptional, IsString } from 'class-validator';

export class CreateTechniqueDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  nameEn?: string;
}
