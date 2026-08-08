import type { Response } from 'express';

export const REFRESH_COOKIE = 'gall_refresh';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// One place that knows how the refresh cookie is shaped, because clearing it
// only works if every attribute matches what set it — a mismatched Path or
// SameSite leaves the old cookie in place and logout silently does nothing.
//
//  httpOnly  the whole point: script on the page cannot read it, so an XSS
//            can ride the session while it runs but cannot carry the
//            credential off the machine and use it for the next 30 days.
//  secure    Secure cookies need a secure context. Dev is served over the
//            Tailscale certificate, so this holds there as well as in prod.
//  sameSite  'lax' is enough here: the web app and the API share a
//            registrable domain in both environments (tailnet name in dev,
//            viktorumm.com in prod), so this is same-site, while a genuine
//            cross-site POST — the CSRF case — is not sent the cookie.
//  path      the cookie is only ever needed by /auth/refresh and
//            /auth/logout, so it is not attached to every other API call.
//            Everything else authenticates with a bearer header and has no
//            CSRF surface at all.
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/auth',
} as const;

export function setRefreshCookie(response: Response, token: string): void {
  response.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions,
    maxAge: THIRTY_DAYS_MS,
  });
}

export function clearRefreshCookie(response: Response): void {
  response.clearCookie(REFRESH_COOKIE, cookieOptions);
}
