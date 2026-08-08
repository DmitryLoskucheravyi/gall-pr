import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { AppModule } from './app.module';
import { corsOriginDelegate } from './config/cors';

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
  const app = await NestFactory.create(
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

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Was origin: '*' — see config/cors.ts for why that had to go.
  app.enableCors({ origin: corsOriginDelegate });

  const port = Number(process.env.PORT) || 3001;

  await app.listen(port, '0.0.0.0');

  console.log(
    `HTTP${hasCert ? 'S' : ''} server running on http${hasCert ? 's' : ''}://localhost:${port}`,
  );
}

void bootstrap();
