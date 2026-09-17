// Whether a reverse proxy sits in front of this process, and how much of what
// it says to believe.
//
// This is deliberately opt-in and off by default, because getting it wrong in
// the permissive direction is worse than not having it at all. Every
// forwarded-address header — X-Forwarded-For, CF-Connecting-IP — is just a
// header: anyone who can reach the origin directly can write whatever they
// like in one. Trust it unconditionally and every attacker gets a private
// rate-limit bucket per forged address, which is a more thorough defeat of
// throttling than having none, since it also looks like it's working.
//
// So the operator has to say a proxy is there. In development nothing is in
// front of the server, req.ip is the peer, and that is the truth.
//
// TRUST_PROXY accepts what Express does:
//   unset / '' / 'false'  no proxy — use the socket's own address
//   '2'                   that many proxies in front (Cloudflare, then Caddy)
//   'loopback'            trust a proxy on this machine
//   '10.0.0.0/8, ...'     an explicit list of trusted addresses or subnets
export type TrustProxySetting = boolean | number | string;

export function trustProxySetting(): TrustProxySetting {
  const raw = process.env.TRUST_PROXY?.trim();

  if (!raw || raw === 'false' || raw === '0') return false;
  if (raw === 'true') return true;

  const hops = Number(raw);

  return Number.isInteger(hops) && hops > 0 ? hops : raw;
}

export function isBehindProxy(): boolean {
  return trustProxySetting() !== false;
}

// The address to rate-limit by.
//
// Behind Cloudflare every request arrives from a Cloudflare address, so
// req.ip would put the entire internet in one bucket: the first busy visitor
// spends the allowance and everyone else gets 429. CF-Connecting-IP carries
// the original caller, and Cloudflare overwrites it on the way through, so it
// can't be spoofed by a client that actually goes through Cloudflare.
//
// It's only read when a proxy has been declared — see above for why.
export function clientAddressOf(request: {
  headers?: Record<string, unknown>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string {
  if (isBehindProxy()) {
    const forwarded: unknown = request.headers?.['cf-connecting-ip'];
    // Node hands a repeated header back as an array. Taking [0] off an
    // unknown array is an unknown too, which is exactly what the string check
    // below is for.
    const cloudflareClient: unknown = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded;

    if (typeof cloudflareClient === 'string' && cloudflareClient.trim()) {
      return cloudflareClient.trim();
    }
  }

  // Express has already resolved req.ip against the trust setting, so behind a
  // non-Cloudflare proxy this is still the real caller.
  return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
}
