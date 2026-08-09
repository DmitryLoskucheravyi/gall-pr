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

`TRUST_PROXY=2` because there are two hops: Cloudflare, then Caddy. It has to
be set, or every request looks like it came from Caddy and the entire internet
shares one rate-limit bucket — the first busy visitor spends the allowance and
everyone else gets a 429.

It also must not be set to something looser than the truth. Forwarded addresses
are only headers; if the app believes them when nothing trustworthy wrote them,
an attacker gets a fresh rate-limit bucket per forged address. That's a more
complete defeat of throttling than having none, because it still looks like
it's working. `backend/src/config/proxy.ts` is the whole story.

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
- Apply `backend/temp/support_guest_chat_unique.sql`.
- Rotate `JWT_SECRET` and `JWT_REFRESH_SECRET` away from whatever development
  used. Everyone is signed out once, which costs nothing before launch.
