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

  @IsOptional()
  @IsString()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  supportPhone?: string;

  @IsOptional()
  @IsString()
  supportTelegramUrl?: string;

  @IsOptional()
  @IsString()
  adminTelegramChatId?: string;
}
