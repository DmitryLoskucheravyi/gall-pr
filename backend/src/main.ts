import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { corsOriginDelegate } from './config/cors';
import { trustProxySetting } from './config/proxy';

// HTTPS is opt-in on the presence of a cert in ./cert, which in dev is the
// machine's Tailscale certificate — a real Let's Encrypt one for its tailnet
// name, mounted in rather than baked into the image.
//
// Both sides have to agree: the web app is served over HTTPS on the same
// tailnet name, and a page loaded over HTTPS cannot call an HTTP API — the
// browser blocks it as mixed content. Falls back to plain HTTP when the files
// aren't there, which is what makes localhost-only work need no cert at all.
const keyPath = join(process.cwd(), 'cert', 'key.pem');
const certPath = join(process.cwd(), 'cert', 'cert.pem');
const hasCert = existsSync(keyPath) && existsSync(certPath);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    hasCert
      ? {
          httpsOptions: {
            key: readFileSync(keyPath),
            cert: readFileSync(certPath),
          },
        }
      : undefined,
  );

  // In production this sits behind Caddy, which sits behind Cloudflare, so the
  // socket address is a proxy's and every forwarded header has to be resolved
  // against how many hops are actually in front. Off unless TRUST_PROXY says
  // otherwise — see config/proxy.ts for why the default has to be the
  // suspicious one.
  const trustProxy = trustProxySetting();
  if (trustProxy !== false) {
    app.set('trust proxy', trustProxy);
  }

  // X-Content-Type-Options, X-Frame-Options, Referrer-Policy and friends.
  //
  // contentSecurityPolicy is off: this process serves JSON, not pages, so a CSP
  // here protects nothing — the policy that matters belongs on whatever serves
  // the web build, where the scripts actually run. Turning on helmet's default
  // CSP would only mislabel this as covered.
  //
  // crossOriginResourcePolicy is relaxed for the same reason the CORS list
  // exists: the API is deliberately read across origins by the web client.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // The refresh token arrives as a cookie — see auth/auth.cookie.ts.
  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // credentials: true is what lets the browser send the refresh cookie on a
  // cross-origin request, and it is precisely why origin: '*' had to go first:
  // a wildcard origin and credentialed requests are mutually exclusive, by
  // design. See config/cors.ts.
  app.enableCors({ origin: corsOriginDelegate, credentials: true });

  const port = Number(process.env.PORT) || 3001;

  await app.listen(port, '0.0.0.0');

  console.log(
    `HTTP${hasCert ? 'S' : ''} server running on http${hasCert ? 's' : ''}://localhost:${port}`,
  );
}

void bootstrap();
