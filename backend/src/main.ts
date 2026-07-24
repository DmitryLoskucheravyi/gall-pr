import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
// import { readFileSync } from 'fs';

import { AppModule } from './app.module';

async function bootstrap() {
  // const app = await NestFactory.create(AppModule, {
  //   httpsOptions: {
  //     key: readFileSync('./cert/key.pem'),
  //     cert: readFileSync('./cert/cert.pem'),
  //   },
  // });
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*' });

  const port = Number(process.env.PORT) || 3001;

  await app.listen(port, '0.0.0.0');

  console.log(`HTTP server running on http://localhost:${port}`);
}

void bootstrap();
