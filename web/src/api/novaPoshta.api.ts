import { api } from './client';
import type { NovaPoshtaOption } from '../types/novaPoshta.types';

class NovaPoshtaService {
  async searchCities(query: string): Promise<NovaPoshtaOption[]> {
    const response = await api.get('/nova-poshta/cities', { params: { query } });
    return response.data;
  }

  async getWarehouses(cityRef: string): Promise<NovaPoshtaOption[]> {
    const response = await api.get('/nova-poshta/warehouses', {
      params: { cityRef },
    });
    return response.data;
  }
}

export const novaPoshtaService = new NovaPoshtaService();
