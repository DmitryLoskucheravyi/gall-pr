// Single place that reads the app's signing secrets, and the only place that
// decides what happens when one is missing: the process refuses to start.
//
// A default value here would be worse than no value at all — a fallback secret
// is a secret everybody who has ever read the repository knows, and it fails
// silently, in production, looking exactly like a working install.
function requireSecret(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not set. Generate one with \`openssl rand -hex 32\` and put it in backend/.env.`,
    );
  }

  // Long enough that brute-forcing the HMAC key is not the weakest link.
  if (value.length < 32) {
    throw new Error(`${name} is too short (${value.length} chars) — use at least 32.`);
  }

  return value;
}

// Access and refresh tokens are signed with different keys on purpose. They
// carry an identical payload, so with one shared key a 15-minute access token
// is byte-for-byte acceptable as a 30-day refresh token; the only thing
// stopping that swap was a database comparison. Separate keys make it
// structurally impossible instead of conditionally unlikely.
export function jwtAccessSecret(): string {
  return requireSecret('JWT_SECRET');
}

export function jwtRefreshSecret(): string {
  return requireSecret('JWT_REFRESH_SECRET');
}
