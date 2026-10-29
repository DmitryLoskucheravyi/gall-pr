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

  // The site's own button (not Google's rendered one) uses the token client,
  // which hands the page an access token rather than an ID token. Same
  // questions, asked of Google instead of read off a signature:
  //
  //  - tokeninfo: was this token issued to *our* client id? An access token
  //    from any other app's Google login would otherwise be accepted — the
  //    same reason verifyIdToken checks the audience.
  //  - userinfo: who is it, and has Google verified their address?
  async verifyAccessToken(accessToken: string): Promise<GoogleIdentity> {
    const audience = this.clientId();
    this.client ??= new OAuth2Client(audience);

    try {
      const info = await this.client.getTokenInfo(accessToken);
      if (info.aud !== audience && info.azp !== audience) {
        throw new Error('audience');
      }
    } catch {
      throw new UnauthorizedException(
        'Не вдалося підтвердити вхід через Google',
      );
    }

    let profile: {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
    };

    try {
      const response = await fetch(
        'https://openidconnect.googleapis.com/v1/userinfo',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!response.ok) throw new Error(String(response.status));
      profile = (await response.json()) as typeof profile;
    } catch {
      throw new UnauthorizedException('Не вдалося отримати профіль Google');
    }

    return this.toIdentity(profile);
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

    return this.toIdentity(payload ?? {});
  }

  // An unverified address is one Google itself can't vouch for, and the
  // address is what an existing account is found by. Linking on it would let
  // anyone who can make a Google account claiming somebody's email walk into
  // that person's account here.
  private toIdentity(payload: {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    given_name?: string;
    family_name?: string;
  }): GoogleIdentity {
    if (!payload.sub || !payload.email || payload.email_verified !== true) {
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
