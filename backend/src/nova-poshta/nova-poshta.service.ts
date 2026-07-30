import { Injectable } from '@nestjs/common';

import { CartService } from '../cart/cart.service';
import { SettingsService } from '../settings/settings.service';
import { Identity } from '../common/identity.util';
import type { CartItem } from '../cart/entities/cart-item.entity';

const API_URL = 'https://api.novaposhta.ua/v2.0/json/';

export const DEFAULT_PAINTING_WEIGHT_KG = 0.5;

type NovaPoshtaOption = { ref: string; name: string };

type DocumentPriceResult = {
  Cost?: string | number;
  CostRedelivery?: string | number;
};

export function sumCartWeight(items: CartItem[]): number {
  return items.reduce(
    (sum, item) =>
      sum + Number(item.painting.weight ?? DEFAULT_PAINTING_WEIGHT_KG) * item.quantity,
    0,
  );
}

@Injectable()
export class NovaPoshtaService {
  constructor(
    private readonly cartService: CartService,
    private readonly settingsService: SettingsService,
  ) {}

  private async call<T = { Ref: string; Description: string }>(
    modelName: string,
    calledMethod: string,
    methodProperties: Record<string, unknown>,
  ): Promise<T[]> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: process.env.NOVA_POSHTA_API_KEY,
        modelName,
        calledMethod,
        methodProperties,
      }),
    });

    const json = await response.json();

    if (!json.success) {
      console.warn(`Nova Poshta API ${calledMethod} failed:`, json.errors);
    }

    return json.data ?? [];
  }

  async searchCities(query: string): Promise<NovaPoshtaOption[]> {
    const cities = await this.call('AddressGeneral', 'getCities', {
      FindByString: query,
    });
    return cities.slice(0, 20).map((city) => ({ ref: city.Ref, name: city.Description }));
  }

  async getWarehouses(cityRef: string): Promise<NovaPoshtaOption[]> {
    const warehouses = await this.call('AddressGeneral', 'getWarehouses', {
      CityRef: cityRef,
    });
    return warehouses.map((warehouse) => ({
      ref: warehouse.Ref,
      name: warehouse.Description,
    }));
  }

  // ServiceType/CargoType are fixed since checkout is always warehouse-to-warehouse
  // for a single parcel. RedeliveryCalculate is only sent for cash-on-delivery
  // orders — that's what makes NP return the CostRedelivery (COD) fee at all.
  async calculateDeliveryPrice(params: {
    citySenderRef: string;
    cityRecipientRef: string;
    weight: number;
    cost: number;
    withRedelivery: boolean;
  }): Promise<{ shippingCost: number; redeliveryCost: number }> {
    const methodProperties: Record<string, unknown> = {
      CitySender: params.citySenderRef,
      CityRecipient: params.cityRecipientRef,
      Weight: params.weight.toFixed(2),
      ServiceType: 'WarehouseWarehouse',
      Cost: params.cost.toFixed(2),
      CargoType: 'Parcel',
      SeatsAmount: '1',
    };

    if (params.withRedelivery) {
      // Unlike every other numeric field in this API, RedeliveryCalculate.Amount
      // must be a JSON number — sending it as a string (like Cost/Weight are)
      // makes NP silently reject the whole call with "Amount is incorrect".
      methodProperties.RedeliveryCalculate = {
        CargoType: 'Money',
        Amount: Math.round(params.cost * 100) / 100,
      };
    }

    const [result] = await this.call<DocumentPriceResult>(
      'InternetDocument',
      'getDocumentPrice',
      methodProperties,
    );

    return {
      shippingCost: Number(result?.Cost ?? 0),
      redeliveryCost: Number(result?.CostRedelivery ?? 0),
    };
  }

  // Sender city + weight/cost never come from the client — always derived
  // server-side from settings and the actual cart, so a client can't
  // manipulate the delivery/COD fee that ends up in the order total.
  async calculateDeliveryPriceForCartItems(
    cartItems: CartItem[],
    cityRecipientRef: string,
    withRedelivery: boolean,
  ) {
    if (cartItems.length === 0) return null;

    const settings = await this.settingsService.get();
    if (!settings.novaPoshtaSenderCityRef) return null;

    const cost = cartItems.reduce(
      (sum, item) => sum + Number(item.painting.price) * item.quantity,
      0,
    );

    return this.calculateDeliveryPrice({
      citySenderRef: settings.novaPoshtaSenderCityRef,
      cityRecipientRef,
      weight: sumCartWeight(cartItems),
      cost,
      withRedelivery,
    });
  }

  async calculateDeliveryPriceForIdentity(
    identity: Identity,
    cityRecipientRef: string,
    withRedelivery: boolean,
  ) {
    const { items } = await this.cartService.getCart(identity);
    return this.calculateDeliveryPriceForCartItems(items, cityRecipientRef, withRedelivery);
  }
}
