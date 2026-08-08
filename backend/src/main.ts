import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { corsOriginDelegate } from './config/cors';

// HTTPS is off for now — plain HTTP while we're in dev.
//
// It was opt-in on the presence of a self-signed cert in backend/cert, which
// browsers treat as a secure context so crypto.randomUUID() and friends exist
// when serving over a LAN IP rather than localhost. Nothing depends on that any
// more: the guest token generator now falls back to crypto.getRandomValues,
// which works over plain HTTP. Re-enable by restoring this and the matching
// block in web/vite.config.ts, and pointing VITE_API_URL back at https://.
//
// import { existsSync, readFileSync } from 'fs';
// import { join } from 'path';
//
// const keyPath = join(process.cwd(), 'cert', 'key.pem');
// const certPath = join(process.cwd(), 'cert', 'cert.pem');
// const hasCert = existsSync(keyPath) && existsSync(certPath);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Was origin: '*' — see config/cors.ts for why that had to go.
  app.enableCors({ origin: corsOriginDelegate });

  const port = Number(process.env.PORT) || 3001;

  await app.listen(port, '0.0.0.0');

  console.log(`HTTP server running on http://localhost:${port}`);
}

void bootstrap();
