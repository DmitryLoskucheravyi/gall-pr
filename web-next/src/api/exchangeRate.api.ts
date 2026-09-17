import { api } from './client';

class ExchangeRateService {
  async getUsdToUahRate(): Promise<number> {
    const response = await api.get('/exchange-rate');
    return response.data.usdToUah;
  }
}

export const exchangeRateService = new ExchangeRateService();
