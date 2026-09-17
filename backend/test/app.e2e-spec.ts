import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

// Boots the real application, which means a real database and real signing
// keys. `npm test` deliberately does not run this — the unit suites under src/
// are the ones that have to pass anywhere — so it is skipped, loudly, rather
// than failed when the environment isn't there.
//
//   npm run test:e2e        (with backend/.env filled in)
const configured = !!(
  process.env.DB_HOST &&
  process.env.JWT_SECRET &&
  process.env.JWT_REFRESH_SECRET
);

const describeIfConfigured = configured ? describe : describe.skip;

if (!configured) {
  console.warn(
    '[e2e] Skipped: set DB_HOST, JWT_SECRET and JWT_REFRESH_SECRET to run these.',
  );
}

describeIfConfigured('Gallery API (e2e)', () => {
  let app: INestApplication<App>;

  // Once for the whole file. beforeEach here rebuilt the entire Nest container
  // — database pool, Telegram long-poll, mail dispatcher timer — before every
  // single test.
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('answers at the root', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  it('serves the catalogue to an anonymous visitor', () => {
    return request(app.getHttpServer())
      .get('/paintings?limit=1')
      .expect(200)
      .expect((response) => {
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(typeof response.body.total).toBe('number');
      });
  });

  // The public settings projection must never carry the admin's Telegram chat
  // id or its live linking code — polling this route until the admin pressed
  // "link the bot" was once enough to take over every notification the shop
  // sends.
  it('keeps admin Telegram fields out of public settings', () => {
    return request(app.getHttpServer())
      .get('/settings')
      .expect(200)
      .expect((response) => {
        expect(response.body).not.toHaveProperty('adminTelegramChatId');
        expect(response.body).not.toHaveProperty('adminTelegramLinkCode');
        expect(response.body).not.toHaveProperty('novaPoshtaSenderCityRef');
      });
  });

  it('refuses the admin order list without a token', () => {
    return request(app.getHttpServer()).get('/orders/all').expect(401);
  });

  it('refuses a cart request that carries no identity at all', () => {
    return request(app.getHttpServer()).get('/cart').expect(400);
  });

  it('refuses a malformed guest token rather than querying with it', () => {
    return request(app.getHttpServer())
      .get('/cart')
      .set('X-Guest-Token', 'guest-1')
      .expect(400);
  });

  it('validates the registration body', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('answers a password-reset request the same way for an unknown address', () => {
    return request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: `nobody-${Date.now()}@example.invalid` })
      .expect(201)
      .expect((response) => {
        expect(response.body.message).toEqual(expect.any(String));
      });
  });
});
