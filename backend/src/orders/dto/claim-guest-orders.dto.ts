import { IsString, Matches } from 'class-validator';

import { GUEST_TOKEN_PATTERN } from '../../common/identity.util';

export class ClaimGuestOrdersDto {
  @IsString()
  @Matches(GUEST_TOKEN_PATTERN, { message: 'Malformed guest token' })
  guestToken: string;
}
