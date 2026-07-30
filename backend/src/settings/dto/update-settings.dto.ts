import { IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  authorName: string;

  @IsString()
  cardTransferIban: string;
}
