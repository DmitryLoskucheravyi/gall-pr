import { useQuery } from '@tanstack/react-query';

import { paintingsService } from '../../api/paintings.api';
import { queryKeys, type PaintingListFilters } from '../../lib/queryKeys';

export function usePaintings(filters: PaintingListFilters) {
  return useQuery({
    queryKey: queryKeys.paintings.list(filters),
    queryFn: ({ signal }) => paintingsService.getPaintings(filters, signal),
    staleTime: 30_000,
  });
}
