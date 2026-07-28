import { useQuery } from '@tanstack/react-query';

import { paintingsService } from '../../api/paintings.api';
import { queryKeys } from '../../lib/queryKeys';

export function usePriceRange() {
  return useQuery({
    queryKey: queryKeys.paintings.priceRange(),
    queryFn: ({ signal }) => paintingsService.getPriceRange(signal),
    staleTime: 5 * 60_000,
  });
}
