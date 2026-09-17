# Deploying

Frontend on Cloudflare Pages, backend in Docker on a DigitalOcean droplet with
Caddy in front, Cloudflare proxying both.

```
browser ──► Cloudflare ──► Caddy (droplet) ──► backend container
```

## What lives where

Most of this checklist is code and configuration, and it's in the repository.
Two things are not, and can't be — they're settings in someone's dashboard.
They're the last two sections here.

## Environment

Copy `backend/.env.example` to `backend/.env` and fill it in. Four values
decide whether the protections in the code actually do anything:

| Variable | Production value | What breaks if it's wrong |
|---|---|---|
| `NODE_ENV` | `production` | `config/cors.ts` keeps allowing localhost and private-range origins |
| `CORS_ORIGINS` | `https://viktorumm.com` | the frontend can't call the API at all, or anyone can |
| `TRUST_PROXY` | `2` | see below |
| `PAYMENTS_CALLBACK_URL` | the public API URL | payment gateways can't call back and orders never settle |
| `WEB_URL` | `https://viktorumm.com` | password-reset links in email point nowhere |

`TRUST_PROXY=2` because there are two hops: Cloudflare, then Caddy. It has to
be set, or every request looks like it came from Caddy and the entire internet
shares one rate-limit bucket — the first busy visitor spends the allowance and
everyone else gets a 429.

It also must not be set to something looser than the truth. Forwarded addresses
are only headers; if the app believes them when nothing trustworthy wrote them,
an attacker gets a fresh rate-limit bucket per forged address. That's a more
complete defeat of throttling than having none, because it still looks like
it's working. `backend/src/config/proxy.ts` is the whole story.

## Schema

There is no migration tooling here (`synchronize: false` on purpose — letting
TypeORM rewrite a live schema is not something to do by accident). So the
schema is applied by hand, and two files describe it:

- `db.sql` — the whole schema, for standing a database up from nothing.
- `backend/temp/*.sql` — changes to apply to a database that already exists.

Apply `backend/temp/2026-09-fixes.sql` before deploying this version. It adds
the sessions and password-reset tables, the indexes `orders` never had, and the
bilingual `*_en` columns — those last ones went into the live database in
September and never reached `db.sql`, which meant a database created from that
dump was missing every column the entities select.

```sh
mysql --ssl-mode=VERIFY_IDENTITY -h "$DB_HOST" -P "$DB_PORT"       -u "$DB_USERNAME" -p "$DB_DATABASE" < backend/temp/2026-09-fixes.sql
```

It is idempotent, so running it twice is a no-op. One statement in it —
`ALTER TABLE users DROP COLUMN refresh_token` — must run *after* the new code
is live: under the old code, dropping it signs everybody out.

Anything applied to the live database from now on belongs in a file under
`backend/temp/` **and** in `db.sql`.

## The frontend on Pages

Two files in `web/public` are part of the deployment rather than the app, and
Pages copies them into the site root at build time:

- `_redirects` — `/* /index.html 200`. Without it Pages answers 404 to every
  deep link, because the routes are entirely client-side.
- `_headers` — CSP and the rest. The API deliberately ships no CSP (it serves
  JSON, not pages); this is where the policy that matters lives.

The CSP allows one inline script by hash: the theme script in `index.html` that
runs before first paint. **Change a byte of that script and the hash in
`_headers` has to change with it**, or the page loads unthemed and the console
fills with CSP violations. Recompute it with:

```sh
node -e "const fs=require('fs'),c=require('crypto');const m=fs.readFileSync('web/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/);console.log('sha256-'+c.createHash('sha256').update(m[1]).digest('base64'))"
```

`connect-src` names `api.viktorumm.com` explicitly — update it if the API ever
moves.

## Bringing it up

```sh
API_DOMAIN=api.viktorumm.com docker compose -f deploy/docker-compose.prod.yml up -d
```

Caddy obtains and renews the certificate itself. The backend publishes no port:
it is reachable only through Caddy, over the compose network.

## Cloudflare — by hand

**DNS.** `viktorumm.com` to Pages, `api.viktorumm.com` to the droplet's IP.
Both proxied (orange cloud). Same registrable domain on purpose: it makes the
web app and the API same-site, which is what lets the refresh cookie work with
`SameSite=Lax` instead of `None`.

**SSL/TLS mode: Full (strict).** Not Flexible, not Full.

- *Flexible* makes Cloudflare talk plain HTTP to the droplet. The last leg is
  unencrypted, and `Secure` cookies won't survive it — sign-in breaks.
- *Full* encrypts it but accepts any certificate, including a self-signed one,
  so it can't tell the droplet from anyone who intercepts the connection.
- *Full (strict)* verifies the certificate. Caddy's is a real Let's Encrypt
  one, so this passes.

**One catch on issuance.** With the orange cloud on, Cloudflare intercepts
`:80`/`:443`, so Caddy's HTTP-01 challenge can't complete. Either:

- turn the proxy off (grey cloud) for `api.` until Caddy has its certificate,
  then turn it back on — simplest, and renewals need the same window; or
- use a Cloudflare Origin Certificate instead, which is built for this and
  which Full (strict) accepts; or
- build Caddy with the `caddy-dns/cloudflare` plugin and use a DNS-01
  challenge, which works with the proxy on and renews unattended.

The third is the one that stops needing attention. The first is fine to launch
with.

## Before the first real customer

- Replace the placeholder interior photos. They're from Wikimedia Commons and
  some are CC BY-SA, which needs attribution — fine for development, not for a
  shop. Clearing them is `PATCH /paintings/:id` with `interiorImages: []`.
- Apply `backend/temp/2026-09-fixes.sql` (see **Schema** above).
- Rotate `JWT_SECRET` and `JWT_REFRESH_SECRET` away from whatever development
  used. Everyone is signed out once, which costs nothing before launch.
- Fill in the Nova Poshta **sender city** in Settings. Until it is set, the
  delivery price cannot be calculated at all — checkout now refuses with a 503
  rather than quietly shipping for free, which is what it used to do.
- Set `SMTP_*`. Password resets are email and nothing else: without a working
  SMTP host, a customer who forgets their password has no way back in.
- Decide about `LIQPAY_*` / `WAYFORPAY_*`. The cart offers card payment only
  when the server reports keys for a gateway (`GET /payments/methods`), so
  leaving them unset simply means cash on delivery and card transfer — which is
  a choice, not a bug, but make it deliberately.
- Replace `web/public/og-cover.jpg`. It's currently a crop of the hero still;
  it is what every shared link renders as.
