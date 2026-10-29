import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';

export type GoogleIdentity = {
  sub: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

// Checks an ID token from Google Identity Services and reduces it to what the
// shop needs. Its own class so the rest of AuthService can be tested without
// Google's keys, and so the client — which caches Google's signing certificates
// between calls — lives once per process rather than once per request.
//
// verifyIdToken checks the signature against Google's published keys, the
// issuer, the expiry, and that the audience is *our* client id. That last one
// is the check that matters most: without it, a token any other site obtained
// for its own Google button would sign the bearer into this shop.
@Injectable()
export class GoogleIdTokenVerifier {
  private client: OAuth2Client | null = null;

  private clientId(): string {
    const id = process.env.GOOGLE_CLIENT_ID?.trim();

    if (!id) {
      throw new ServiceUnavailableException('Вхід через Google не налаштовано');
    }

    return id;
  }

  async verify(credential: string): Promise<GoogleIdentity> {
    const audience = this.clientId();
    this.client ??= new OAuth2Client(audience);

    let payload: TokenPayload | undefined;

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException(
        'Не вдалося підтвердити вхід через Google',
      );
    }

    // An unverified address is one Google itself can't vouch for, and the
    // address is what an existing account is found by. Linking on it would let
    // anyone who can make a Google account claiming somebody's email walk into
    // that person's account here.
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException(
        'Google не підтвердив адресу цього акаунта',
      );
    }

    return {
      sub: payload.sub,
      email: payload.email.trim().toLowerCase(),
      firstName: payload.given_name?.trim().slice(0, 100) || null,
      lastName: payload.family_name?.trim().slice(0, 100) || null,
    };
  }
}
