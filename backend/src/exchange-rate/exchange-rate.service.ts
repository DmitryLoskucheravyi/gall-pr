import { Injectable, Logger } from '@nestjs/common';

const NBU_URL =
  'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — the NBU rate only moves once a day anyway.
const RETRY_BACKOFF_MS = 5 * 60 * 1000; // On failure, don't hammer NBU on every request.

type NbuResponse = { rate: number }[];

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  // Falls back to the last good rate on a fetch failure rather than ever
  // throwing — a transient NBU outage should never break price display.
  private lastKnownRate = 41.5;
  private fetchedAt = 0;
  private lastAttemptAt = 0;

  async getUsdToUahRate(): Promise<number> {
    const now = Date.now();
    const isFresh = now - this.fetchedAt < CACHE_TTL_MS;
    const attemptedRecently = now - this.lastAttemptAt < RETRY_BACKOFF_MS;
    if (isFresh || attemptedRecently) return this.lastKnownRate;

    this.lastAttemptAt = now;

    try {
      const response = await fetch(NBU_URL);
      if (!response.ok) throw new Error(`NBU responded ${response.status}`);

      const data = (await response.json()) as NbuResponse;
      const rate = data[0]?.rate;
      if (!rate || rate <= 0) throw new Error('NBU response missing a rate');

      this.lastKnownRate = rate;
      this.fetchedAt = Date.now();
    } catch (error) {
      this.logger.warn(
        `Couldn't refresh the USD/UAH rate, keeping the last known one (${this.lastKnownRate}): ${error}`,
      );
    }

    return this.lastKnownRate;
  }
}
