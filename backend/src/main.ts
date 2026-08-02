import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { AppModule } from './app.module';

async function bootstrap() {
  const keyPath = join(process.cwd(), 'cert', 'key.pem');
  const certPath = join(process.cwd(), 'cert', 'cert.pem');
  // HTTPS is opt-in based on whether a dev cert is present — needed so
  // browsers treat the origin as a secure context (crypto.randomUUID(),
  // among other APIs, silently doesn't exist otherwise) when testing over
  // a LAN IP instead of localhost. Falls back to plain HTTP wherever the
  // cert isn't there (e.g. the Docker image doesn't ship one).
  const hasCert = existsSync(keyPath) && existsSync(certPath);

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

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*' });

  const port = Number(process.env.PORT) || 3001;

  await app.listen(port, '0.0.0.0');

  console.log(
    `HTTP${hasCert ? 'S' : ''} server running on http${hasCert ? 's' : ''}://localhost:${port}`,
  );
}

void bootstrap();
