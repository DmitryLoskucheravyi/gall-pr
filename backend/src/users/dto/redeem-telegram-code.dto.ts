import { IsString, Length } from 'class-validator';

export class RedeemTelegramCodeDto {
  @IsString()
  @Length(6, 6)
  code: string;
}
