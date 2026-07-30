import { useQuery } from '@tanstack/react-query';

import { novaPoshtaService } from '../../api/novaPoshta.api';
import { queryKeys } from '../../lib/queryKeys';

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
