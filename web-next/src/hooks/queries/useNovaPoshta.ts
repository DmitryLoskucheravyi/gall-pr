import { useQuery } from '@tanstack/react-query';

import { novaPoshtaService } from '../../api/novaPoshta.api';
import { queryKeys } from '../../lib/queryKeys';
import { useCart } from './useCart';

export function useNovaPoshtaCities(query: string) {
  return useQuery({
    queryKey: queryKeys.novaPoshta.cities(query),
    queryFn: () => novaPoshtaService.searchCities(query),
    enabled: query.trim().length >= 2,
    staleTime: 60 * 60_000,
  });
}

export function useNovaPoshtaWarehouses(cityRef: string | null) {
  return useQuery({
    queryKey: queryKeys.novaPoshta.warehouses(cityRef ?? ''),
    queryFn: () => novaPoshtaService.getWarehouses(cityRef!),
    enabled: !!cityRef,
    staleTime: 60 * 60_000,
  });
}

export function useNovaPoshtaDeliveryPrice(
  cityRecipientRef: string | null,
  withRedelivery: boolean,
) {
  // Cart total is folded into the query key so adding/removing items (which
  // changes the server-computed weight/cost) triggers a fresh price fetch.
  const { data: cart } = useCart();
  const total = cart?.total ?? 0;

  return useQuery({
    queryKey: [
      ...queryKeys.novaPoshta.deliveryPrice(cityRecipientRef ?? '', withRedelivery),
      total,
    ],
    queryFn: () =>
      novaPoshtaService.getDeliveryPrice(cityRecipientRef!, withRedelivery),
    enabled: !!cityRecipientRef,
    staleTime: 60_000,
  });
}
