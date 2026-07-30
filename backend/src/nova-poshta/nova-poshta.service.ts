import { Injectable } from '@nestjs/common';

const API_URL = 'https://api.novaposhta.ua/v2.0/json/';

type NovaPoshtaOption = { ref: string; name: string };

@Injectable()
export class NovaPoshtaService {
  private async call(
    calledMethod: string,
    methodProperties: Record<string, unknown>,
  ): Promise<{ Ref: string; Description: string }[]> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: process.env.NOVA_POSHTA_API_KEY,
        modelName: 'AddressGeneral',
        calledMethod,
        methodProperties,
      }),
    });

    const json = await response.json();
    return json.data ?? [];
  }

  async searchCities(query: string): Promise<NovaPoshtaOption[]> {
    const cities = await this.call('getCities', { FindByString: query });
    return cities.slice(0, 20).map((city) => ({ ref: city.Ref, name: city.Description }));
  }

  async getWarehouses(cityRef: string): Promise<NovaPoshtaOption[]> {
    const warehouses = await this.call('getWarehouses', { CityRef: cityRef });
    return warehouses.map((warehouse) => ({
      ref: warehouse.Ref,
      name: warehouse.Description,
    }));
  }
}
