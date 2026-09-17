import { api } from './client';
import type {
  NovaPoshtaDeliveryPrice,
  NovaPoshtaOption,
} from '../types/novaPoshta.types';

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

  async getDeliveryPrice(
    cityRecipientRef: string,
    withRedelivery: boolean,
  ): Promise<NovaPoshtaDeliveryPrice> {
    const response = await api.get('/nova-poshta/delivery-price', {
      params: { cityRecipientRef, withRedelivery },
    });
    return response.data;
  }
}

export const novaPoshtaService = new NovaPoshtaService();
