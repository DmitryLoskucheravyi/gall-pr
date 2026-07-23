import { IsString } from 'class-validator';

export class CreateTechniqueDto {
  @IsString()
  name: string;
}
