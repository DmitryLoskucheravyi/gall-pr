import { IsString, Matches } from 'class-validator';

// Same UUID-v4 shape resolveIdentity() enforces on the X-Guest-Token header —
// a token arriving in a body is no more trustworthy than one in a header, and
// this route hands the named cart to whoever asks.
const GUEST_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class MergeCartDto {
  @IsString()
  @Matches(GUEST_TOKEN_PATTERN, { message: 'Malformed guest token' })
  guestToken: string;
}
