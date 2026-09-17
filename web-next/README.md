# web-next

The gallery's front end on Next.js (App Router). Migration of `web/` per
[`docs/next-migration.md`](../docs/next-migration.md). The NestJS backend is
untouched — this talks to the same API.

Both apps exist side by side while this is verified. `web/` is still what is
deployed until the cutover in §8 of the plan.

## Why

The SPA rendered everything in the browser. Googlebot runs JavaScript, but as a
second pass, in a queue, with a budget — so a catalogue of any size has pages
that never get their render. Here the painting pages are real HTML:

```
$ grep -o '<h1[^>]*>[^<]*' .next/server/app/ua/painting/120023.html
<h1 class="...">Всередині стін
```

Title, price, description and JSON-LD are all in the markup before a line of
JavaScript executes.

## Running it

```sh
npm install
npm run dev          # http://localhost:3000
npm run build        # production build; prerenders every static page
npm run typecheck
npm run lint
```

`.env.local`:

| Variable | Example | Used by |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.viktorumm.com` | the browser, and the CSP's `connect-src` at build time |
| `API_URL` | `https://api.viktorumm.com` | Server Components and `sitemap.ts` |
| `NEXT_PUBLIC_SITE_URL` | `https://viktorumm.com` | canonical URLs, hreflang, sitemap |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | `viktorumm_bot` | the profile page's deep link |

`API_URL` and `NEXT_PUBLIC_API_URL` are usually the same value. They are
separate because the `NEXT_PUBLIC_` one is inlined into the client bundle and
the other is not — the server's copy never reaches the browser.

## How it is laid out

```
src/
  app/
    [locale]/            the root layout: <html lang>, providers, chrome
      layout.tsx
      page.tsx           one thin Server Component per route…
      painting/[id]/     …except this one, which fetches and prerenders
    sitemap.ts           replaces web/functions/sitemap.xml.ts
    robots.ts            replaces web/public/robots.txt
    providers.tsx        Redux + TanStack Query + i18next, one client boundary
  views/                 the old pages/, unchanged, all 'use client'
  components/ hooks/ api/ store/ utils/ types/ locales/ styles/
  lib/
    api-server.ts        server-side API client, no Redux, no auth
    metadata.ts          titles, canonical and hreflang for Server Components
  middleware.ts          bare path → /ua
```

A page is a Server Component whose only job is `generateMetadata`; the view it
renders is the same client component the SPA had. That split is what lets the
metadata be server-rendered without rewriting 17 000 lines of interface.

## Things that are deliberate

**Rendering.** Painting pages are static with hourly revalidation
(`generateStaticParams` covers the first 100; the rest arrive through
`dynamicParams` on first request). Giveaways are `force-dynamic` — deadlines
move. Everything behind a login is client-rendered and `noindex`.

**Auth stayed on the client.** The refresh cookie is scoped to `/auth` and the
access token lives in memory, so a Server Component could not read a session
even if it wanted one. Nothing server-rendered here is personal — see §3.2 of
the plan for the version that changes this, and why it was not worth it.

**One QueryClient per request.** `lib/queryClient.ts` exports a factory, not an
instance. A module-level client under SSR is shared by every request the server
handles, which means one visitor's cart can be served to the next.

**CSP allows inline scripts.** A step back from the SPA's hash-based policy, and
the reason is in `next.config.ts`: the alternative is a per-request nonce, which
would make every page dynamic and undo the static rendering this migration
exists for.

**`window` is guarded everywhere it is read during render.** Four components
read the viewport or `matchMedia` in a `useState` initialiser or the render
body, which the server executes too. They now answer with a neutral default and
correct themselves on mount — see `useReducedMotion` for the pattern and why
reading it during render cannot work under SSR even where `window` exists.

## Once this is deployed

`web/functions/` and `web/public/robots.txt` become dead code: `app/sitemap.ts`,
`app/robots.ts` and `generateMetadata` cover the same ground natively. Delete
`web/` at the cutover, not before.
