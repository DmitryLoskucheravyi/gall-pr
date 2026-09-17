import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { CartService } from '../cart/cart.service';
import { SettingsService } from '../settings/settings.service';
import { Identity } from '../common/identity.util';
import { UpstreamError, fetchJson } from '../common/http.util';
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
      sum +
      Number(item.painting.weight ?? DEFAULT_PAINTING_WEIGHT_KG) *
        item.quantity,
    0,
  );
}

@Injectable()
export class NovaPoshtaService {
  private readonly logger = new Logger(NovaPoshtaService.name);

  constructor(
    private readonly cartService: CartService,
    private readonly settingsService: SettingsService,
  ) {}

  // Throws rather than returns an empty list on failure, and that distinction
  // is the whole point.
  //
  // This used to log a warning and hand back `[]`. Downstream, the price
  // calculation read `Number(result?.Cost ?? 0)` out of that empty list and
  // returned a perfectly well-formed { shippingCost: 0, redeliveryCost: 0 } —
  // so every checkout placed while Nova Poshta was unreachable, or while the
  // API key was wrong, shipped for free and nothing anywhere said so. A
  // failure that looks exactly like a successful answer of zero is worse than
  // an outage.
  private async call<T = { Ref: string; Description: string }>(
    modelName: string,
    calledMethod: string,
    methodProperties: Record<string, unknown>,
  ): Promise<T[]> {
    const json = await fetchJson<{
      success?: boolean;
      data?: T[];
      errors?: unknown[];
    }>('Nova Poshta', API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: process.env.NOVA_POSHTA_API_KEY,
        modelName,
        calledMethod,
        methodProperties,
      }),
    });

    if (!json.success) {
      throw new UpstreamError(
        'Nova Poshta',
        `${calledMethod} failed: ${JSON.stringify(json.errors ?? [])}`,
      );
    }

    return json.data ?? [];
  }

  // The city picker types ahead, and a momentary upstream hiccup there should
  // show an empty list rather than an error on every keystroke. Anything that
  // decides money goes through call() directly and is allowed to fail loudly.
  private async callQuietly<T = { Ref: string; Description: string }>(
    modelName: string,
    calledMethod: string,
    methodProperties: Record<string, unknown>,
  ): Promise<T[]> {
    try {
      return await this.call<T>(modelName, calledMethod, methodProperties);
    } catch (error) {
      this.logger.warn(
        `Nova Poshta ${calledMethod} unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async searchCities(query: string): Promise<NovaPoshtaOption[]> {
    const cities = await this.callQuietly('AddressGeneral', 'getCities', {
      FindByString: query,
    });
    return cities
      .slice(0, 20)
      .map((city) => ({ ref: city.Ref, name: city.Description }));
  }

  // Resolves a city ref back to its name, so the address written onto an order
  // comes from Nova Poshta rather than from whatever string the client typed
  // alongside the ref.
  async getCityByRef(cityRef: string): Promise<NovaPoshtaOption | null> {
    const [city] = await this.call('AddressGeneral', 'getCities', {
      Ref: cityRef,
    });

    return city ? { ref: city.Ref, name: city.Description } : null;
  }

  // Confirms the warehouse actually belongs to the city, and hands back its
  // canonical name. A warehouse ref from a different city resolves to null.
  async getWarehouseByRef(
    cityRef: string,
    warehouseRef: string,
  ): Promise<NovaPoshtaOption | null> {
    const warehouses = await this.getWarehouses(cityRef);

    return (
      warehouses.find((warehouse) => warehouse.ref === warehouseRef) ?? null
    );
  }

  async getWarehouses(cityRef: string): Promise<NovaPoshtaOption[]> {
    const warehouses = await this.callQuietly(
      'AddressGeneral',
      'getWarehouses',
      { CityRef: cityRef },
    );
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

    // No row back means Nova Poshta did not quote this shipment. Reading a
    // missing Cost as zero is what made an outage indistinguishable from free
    // delivery, so an unquoted shipment throws and the caller has to decide
    // what to do about it.
    if (!result || result.Cost === undefined || result.Cost === null) {
      throw new UpstreamError(
        'Nova Poshta',
        'getDocumentPrice returned no quote for this shipment',
      );
    }

    const shippingCost = Number(result.Cost);
    const redeliveryCost = Number(result.CostRedelivery ?? 0);

    if (!Number.isFinite(shippingCost) || !Number.isFinite(redeliveryCost)) {
      throw new UpstreamError(
        'Nova Poshta',
        'getDocumentPrice quoted a non-number',
      );
    }

    return { shippingCost, redeliveryCost };
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

    // Without a sender city there is nothing to price from. Silently returning
    // null here meant every order in the shop shipped free until somebody
    // noticed the field was blank — and the settings row is created with it
    // blank. Loud, and pointed at the person who can fix it.
    if (!settings.novaPoshtaSenderCityRef) {
      this.logger.error(
        'Nova Poshta sender city is not configured — delivery cannot be priced. Set it in Settings.',
      );
      throw new UpstreamError(
        'Nova Poshta',
        'sender city is not configured in app settings',
      );
    }

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

  // What the HTTP layer and checkout both reach for when the upstream has
  // failed: a 503 carrying a sentence a customer can act on, rather than a 500
  // or — far worse — a quiet zero.
  static unavailable(): never {
    throw new ServiceUnavailableException(
      'Не вдалося розрахувати вартість доставки — Нова пошта зараз недоступна. Спробуйте за кілька хвилин.',
    );
  }

  async calculateDeliveryPriceForIdentity(
    identity: Identity,
    cityRecipientRef: string,
    withRedelivery: boolean,
  ) {
    const { items } = await this.cartService.getCart(identity);

    try {
      return await this.calculateDeliveryPriceForCartItems(
        items,
        cityRecipientRef,
        withRedelivery,
      );
    } catch (error) {
      if (error instanceof UpstreamError) {
        this.logger.warn(error.message);
        NovaPoshtaService.unavailable();
      }

      throw error;
    }
  }
}
