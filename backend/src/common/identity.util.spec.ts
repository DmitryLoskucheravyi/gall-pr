import { BadRequestException } from '@nestjs/common';

import { isValidGuestToken, resolveIdentity } from './identity.util';
import type { OptionalAuthenticatedRequest } from '../auth/types/optional-authenticated-request.type';

// The guest token authorises reading a guest's orders — name, phone, email,
// delivery address — so whatever it is called, it is a bearer credential. The
// shape check is what keeps short, guessable, hand-typed values from ever
// reaching a query.

describe('isValidGuestToken', () => {
  it('accepts a UUID v4 in either case', () => {
    expect(isValidGuestToken('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(
      true,
    );
    expect(isValidGuestToken('3F2504E0-4F89-41D3-9A0C-0305E82C3301')).toBe(
      true,
    );
  });

  it('rejects anything that is not one', () => {
    for (const value of [
      '',
      'guest',
      '1',
      '3f2504e0-4f89-11d3-9a0c-0305e82c3301', // version 1, not 4
      '3f2504e0-4f89-41d3-ca0c-0305e82c3301', // bad variant nibble
      '3f2504e0-4f89-41d3-9a0c-0305e82c3301-extra',
      null,
      42,
      {},
    ]) {
      expect(isValidGuestToken(value)).toBe(false);
    }
  });
});

describe('resolveIdentity', () => {
  const request = (
    overrides: Partial<OptionalAuthenticatedRequest>,
  ): OptionalAuthenticatedRequest =>
    ({ headers: {}, ...overrides }) as OptionalAuthenticatedRequest;

  it('prefers the signed-in user over any header', () => {
    const identity = resolveIdentity(
      request({
        user: { id: 7, email: 'a@b.test', role: 'USER' },
        headers: { 'x-guest-token': '3f2504e0-4f89-41d3-9a0c-0305e82c3301' },
      } as Partial<OptionalAuthenticatedRequest>),
    );

    expect(identity).toEqual({ userId: 7 });
  });

  it('falls back to a well-formed guest token', () => {
    const identity = resolveIdentity(
      request({
        headers: { 'x-guest-token': '3f2504e0-4f89-41d3-9a0c-0305e82c3301' },
      }),
    );

    expect(identity).toEqual({
      guestToken: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    });
  });

  it('refuses a request with no identity at all', () => {
    expect(() => resolveIdentity(request({}))).toThrow(BadRequestException);
  });

  it('refuses a malformed guest token rather than querying with it', () => {
    expect(() =>
      resolveIdentity(request({ headers: { 'x-guest-token': 'guest-1' } })),
    ).toThrow('Malformed guest token');
  });
});
