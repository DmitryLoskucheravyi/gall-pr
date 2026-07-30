import { IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsString()
  cardTransferIban?: string;

  @IsOptional()
  @IsString()
  novaPoshtaSenderCityRef?: string;

  @IsOptional()
  @IsString()
  novaPoshtaSenderCityName?: string;
}
