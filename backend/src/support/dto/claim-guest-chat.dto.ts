import { IsString, Matches } from 'class-validator';

// See MergeCartDto — same token, same reasoning.
const GUEST_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ClaimGuestChatDto {
  @IsString()
  @Matches(GUEST_TOKEN_PATTERN, { message: 'Malformed guest token' })
  guestToken: string;
}
