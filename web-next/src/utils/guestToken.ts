import { readStored, removeStored, writeStored } from './safeStorage';

const STORAGE_KEY = 'gall_guest_token';

// This token is what the backend accepts as proof that a request belongs to a
// given anonymous cart — and to that guest's orders, which carry their name,
// phone, email and delivery address. So it is a bearer credential, and it has
// to be unguessable.
//
// crypto.randomUUID() is unavailable outside a secure context, which is why
// this needed a fallback at all: over plain HTTP on a LAN IP (testing from a
// phone) it simply doesn't exist. crypto.getRandomValues() is *not* restricted
// that way — it works on plain HTTP — so the fallback can keep the same 122
// bits of real entropy instead of dropping to Math.random(), whose internal
// state is recoverable from a few outputs and whose tokens are therefore
// predictable to anyone who can sample them.
function randomUuidV4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Version 4, variant 1 — the two fixed fields in RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

function generateGuestId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return randomUuidV4();
}

// The backend rejects anything that isn't a well-formed UUID v4, so a token
// left over from the old Math.random() generator — or any other junk that found
// its way into localStorage — has to be replaced rather than sent.
const GUEST_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isWellFormed(token: string | null): token is string {
  return !!token && GUEST_TOKEN_PATTERN.test(token);
}

// Through safeStorage rather than localStorage directly: this function is
// called from the axios request interceptor on every request, so a browser
// that throws on storage access used to take the whole API layer with it.
export function peekGuestToken(): string | null {
  const token = readStored(STORAGE_KEY);

  return isWellFormed(token) ? token : null;
}

export function getGuestToken(): string {
  const existing = readStored(STORAGE_KEY);

  if (isWellFormed(existing)) {
    return existing;
  }

  const token = generateGuestId();
  writeStored(STORAGE_KEY, token);

  return token;
}

export function clearGuestToken() {
  removeStored(STORAGE_KEY);
}
