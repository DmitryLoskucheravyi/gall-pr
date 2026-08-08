import { IsString } from 'class-validator';

export class ClaimGuestChatDto {
  @IsString()
  guestToken: string;
}
