import type { NextConfig } from 'next';
import path from 'path';

// The API's origin, needed by connect-src for both fetch and the support
// websocket. Read at build time from the same variable the client uses.
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? '').origin;
  } catch {
    return 'https://api.viktorumm.com';
  }
})();

const WS_ORIGIN = API_ORIGIN.replace(/^http/, 'ws');

// script-src allows 'unsafe-inline', and that is a deliberate step back from
// what the Vite build had.
//
// The SPA shipped exactly one inline script — the theme script — and allowed it
// by hash. Next injects its own inline scripts for hydration and streaming, and
// there are only two ways to permit those: a per-request nonce, or
// 'unsafe-inline'. A nonce changes on every request, which forces every page to
// be rendered on demand — and static generation is the entire reason this app
// moved to Next in the first place.
//
// So the trade is explicit: inline scripts are allowed, and everything else
// stays tight. If the CSP ever matters more than the static rendering, the fix
// is a nonce in middleware and `export const dynamic = 'force-dynamic'` — see
// docs/next-migration.md.
// Fast Refresh compiles modules with eval(), so development needs
// 'unsafe-eval' and production must not have it. Keyed off NODE_ENV, which
// Next sets itself — `next dev` is development, `next build` is production —
// so this cannot be got wrong by forgetting a flag.
//
// Without it the dev server loads and then hot reloading silently dies:
// "Evaluating a string as JavaScript violates the following Content Security
// Policy directive", thrown from @next/react-refresh-utils.
const DEV = process.env.NODE_ENV === 'development';

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://www.liqpay.ua https://secure.wayforpay.com",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "media-src 'self' https://res.cloudinary.com",
  "font-src 'self' data:",
  // The last two are the dev server's own HMR socket; harmless in production,
  // where nothing listens on them, but omitted anyway to keep the policy
  // honest about what it permits.
  `connect-src 'self' ${API_ORIGIN} ${WS_ORIGIN}${DEV ? ' ws: wss:' : ''}`,
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  // Exactly what vite.config.ts did with
  // css.preprocessorOptions.scss.additionalData — every SCSS module gets the
  // variables and mixins without importing them by hand. 62 stylesheets rely
  // on this, so it has to survive the move unchanged.
  sassOptions: {
    additionalData: `@use "@/styles/variables" as *; @use "@/styles/mixins" as *;`,
    includePaths: [path.join(process.cwd(), 'src')],
  },

  images: {
    // Cloudinary already resizes and re-encodes (see utils/imageUrl.ts), so
    // next/image is here for srcset and reserved space — the CLS half — rather
    // than for the optimisation it usually brings.
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },

  // Replaces web/public/_headers. On Cloudflare Pages that file only applied
  // to static assets; here the headers travel with every response, including
  // the server-rendered ones.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Nothing here is ever framed. Clickjacking on a shop means an
          // invisible overlay on the "buy" button.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Content-Security-Policy',
            value: CSP,
          },
        ],
      },
    ];
  },

  eslint: {
    // The project lints with oxlint, which Next doesn't know about. Running
    // `npm run lint` is a separate step, not part of the build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
