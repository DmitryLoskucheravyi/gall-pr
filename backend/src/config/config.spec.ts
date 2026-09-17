import { isAllowedOrigin } from './cors';
import { clientAddressOf, trustProxySetting } from './proxy';
import { jwtAccessSecret, jwtRefreshSecret } from './secrets';

// These three files are each one decision that everything else depends on:
// who may call the API, whose address to rate-limit, and whether the process
// is allowed to start without a signing key.

describe('isAllowedOrigin', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it('allows an origin on the configured list', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS =
      'https://viktorumm.com, https://www.viktorumm.com';

    expect(isAllowedOrigin('https://viktorumm.com')).toBe(true);
    expect(isAllowedOrigin('https://www.viktorumm.com')).toBe(true);
  });

  it('ignores a trailing slash on either side', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://viktorumm.com/';

    expect(isAllowedOrigin('https://viktorumm.com')).toBe(true);
  });

  it('refuses anything else in production, localhost included', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://viktorumm.com';

    expect(isAllowedOrigin('https://viktorumm.com.evil.example')).toBe(false);
    expect(isAllowedOrigin('http://localhost:5173')).toBe(false);
    expect(isAllowedOrigin('http://192.168.0.5:5173')).toBe(false);
  });

  // Dev is served off whatever address the machine happens to have, and that
  // changes between sessions — but only outside production.
  it('allows loopback and private ranges outside production', () => {
    process.env.NODE_ENV = 'development';
    process.env.CORS_ORIGINS = '';

    expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
    expect(isAllowedOrigin('http://192.168.1.20:5173')).toBe(true);
    expect(isAllowedOrigin('https://example.com')).toBe(false);
  });
});

describe('trustProxySetting', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  // The default has to be the suspicious one: believing a forwarded header
  // nobody trustworthy wrote hands every attacker a private rate-limit bucket.
  it('trusts nothing unless a proxy is declared', () => {
    delete process.env.TRUST_PROXY;
    expect(trustProxySetting()).toBe(false);

    process.env.TRUST_PROXY = '';
    expect(trustProxySetting()).toBe(false);

    process.env.TRUST_PROXY = 'false';
    expect(trustProxySetting()).toBe(false);
  });

  it('reads a hop count as a number and anything else as an Express setting', () => {
    process.env.TRUST_PROXY = '2';
    expect(trustProxySetting()).toBe(2);

    process.env.TRUST_PROXY = 'loopback';
    expect(trustProxySetting()).toBe('loopback');
  });
});

describe('clientAddressOf', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it('ignores CF-Connecting-IP when no proxy is declared', () => {
    delete process.env.TRUST_PROXY;

    expect(
      clientAddressOf({
        headers: { 'cf-connecting-ip': '1.2.3.4' },
        ip: '10.0.0.9',
      }),
    ).toBe('10.0.0.9');
  });

  it('reads CF-Connecting-IP once a proxy is declared', () => {
    process.env.TRUST_PROXY = '2';

    expect(
      clientAddressOf({
        headers: { 'cf-connecting-ip': '1.2.3.4' },
        ip: '10.0.0.9',
      }),
    ).toBe('1.2.3.4');
  });

  it('falls back to the socket address when nothing else is known', () => {
    delete process.env.TRUST_PROXY;

    expect(clientAddressOf({ socket: { remoteAddress: '::1' } })).toBe('::1');
    expect(clientAddressOf({})).toBe('unknown');
  });
});

describe('secrets', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  // A default here would be a secret everyone who has read the repository
  // knows, and it would fail silently in production.
  it('refuses to hand back a secret that is missing or too short', () => {
    delete process.env.JWT_SECRET;
    expect(() => jwtAccessSecret()).toThrow(/JWT_SECRET is not set/);

    process.env.JWT_SECRET = 'too-short';
    expect(() => jwtAccessSecret()).toThrow(/too short/);
  });

  it('returns a secret of a usable length', () => {
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);

    expect(jwtAccessSecret()).toHaveLength(64);
    expect(jwtRefreshSecret()).toHaveLength(64);
  });
});
