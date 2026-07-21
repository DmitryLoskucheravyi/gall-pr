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

  await app.listen(3000, '0.0.0.0');

  // console.log('HTTPS server running on https://localhost:3000');
  console.log('HTTP server running on http://localhost:3000');
}

void bootstrap();
