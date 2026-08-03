import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  // @IsOptional() waves through null as well as undefined, which is what
  // clears a hero slot back to the automatic pick.
  @IsOptional()
  @IsInt()
  heroPaintingId1?: number | null;

  @IsOptional()
  @IsInt()
  heroPaintingId2?: number | null;

  @IsOptional()
  @IsInt()
  heroPaintingId3?: number | null;

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
}
