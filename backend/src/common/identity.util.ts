import { BadRequestException } from '@nestjs/common';

import { OptionalAuthenticatedRequest } from '../auth/types/optional-authenticated-request.type';

export type Identity = { userId: number } | { guestToken: string };

// A guest token is a UUID v4 as issued by the web client. Pinning the shape
// server-side does three things:
//
//  - it keeps a token inside the guest_token column's varchar(64), instead of
//    failing on insert or being silently truncated (two guests sharing a
//    truncated prefix would land in each other's cart);
//  - it rejects the short, guessable, hand-typed strings that someone probing
//    for other people's carts and orders would start with;
//  - it means the value can be treated as opaque everywhere downstream.
const GUEST_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidGuestToken(value: unknown): value is string {
  return typeof value === 'string' && GUEST_TOKEN_PATTERN.test(value);
}

// Cart/orders routes run behind OptionalJwtAuthGuard so both logged-in
// users and anonymous guests can hit them: a valid JWT resolves req.user
// as usual, otherwise the caller must send an X-Guest-Token header
// identifying their anonymous cart.
//
// Worth being honest about what this header is: it authorises reading a guest's
// orders — name, phone, email, delivery address — so it is a bearer credential,
// whatever it's called. Anyone holding it is that guest. What follows from that
// is that it has to be unguessable (the client generates it with the platform
// CSPRNG) and shaped exactly as expected; it can't be made safe to leak.
export function resolveIdentity(req: OptionalAuthenticatedRequest): Identity {
  if (req.user) {
    return { userId: req.user.id };
  }

  const guestToken = req.headers['x-guest-token'];

  if (typeof guestToken !== 'string' || !guestToken.trim()) {
    throw new BadRequestException('Guest token required');
  }

  if (!isValidGuestToken(guestToken)) {
    throw new BadRequestException('Malformed guest token');
  }

  return { guestToken };
}
