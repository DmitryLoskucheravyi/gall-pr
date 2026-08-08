// `origin: '*'` let any site on the internet call this API from a visitor's
// browser. It didn't leak tokens by itself — they travel in an Authorization
// header we set by hand, not in cookies the browser would attach — but it
// removed the one boundary that keeps a scripting bug local, and it rules out
// ever moving the refresh token into an httpOnly cookie, since credentialed
// requests are not allowed against a wildcard origin.
//
// So: an explicit list, from CORS_ORIGINS (comma-separated) or WEB_URL.
const configuredOrigins = (): string[] => {
  const raw = process.env.CORS_ORIGINS ?? process.env.WEB_URL ?? '';

  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
};

// Dev is served off whatever address the machine happens to have — localhost on
// the desktop, a DHCP LAN address when testing from a phone, and that address
// changes between sessions. Pinning it in .env would mean editing .env every
// time the router hands out a new lease, so loopback and private ranges are
// allowed outside production instead. None of this applies once NODE_ENV is
// production, where only the configured list is accepted.
const LOCAL_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

export function isAllowedOrigin(origin: string): boolean {
  if (configuredOrigins().includes(origin.replace(/\/$/, ''))) {
    return true;
  }

  return process.env.NODE_ENV !== 'production' && LOCAL_ORIGIN.test(origin);
}

// The shape both Express's cors middleware and socket.io accept. A missing
// origin means the request didn't come from a browser page — curl, a mobile
// app, a payment gateway posting a callback — and there is no cross-origin
// boundary to enforce for those.
export function corsOriginDelegate(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void {
  if (!origin || isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
}
