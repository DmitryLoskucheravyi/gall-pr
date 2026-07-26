import { BadRequestException } from '@nestjs/common';

import { OptionalAuthenticatedRequest } from '../auth/types/optional-authenticated-request.type';

export type Identity = { userId: number } | { guestToken: string };

// Cart/orders routes run behind OptionalJwtAuthGuard so both logged-in
// users and anonymous guests can hit them: a valid JWT resolves req.user
// as usual, otherwise the caller must send an X-Guest-Token header
// identifying their anonymous cart.
export function resolveIdentity(req: OptionalAuthenticatedRequest): Identity {
  if (req.user) {
    return { userId: req.user.id };
  }

  const guestToken = req.headers['x-guest-token'];

  if (typeof guestToken !== 'string' || !guestToken.trim()) {
    throw new BadRequestException('Guest token required');
  }

  return { guestToken };
}
