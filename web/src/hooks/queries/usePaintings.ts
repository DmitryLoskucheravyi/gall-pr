import { useQuery } from '@tanstack/react-query';

import { paintingsService } from '../../api/paintings.api';
import { queryKeys, type PaintingListFilters } from '../../lib/queryKeys';

type Options = {
  /**
   * Keep showing the previous result while a new key loads, instead of
   * dropping to no data. For paged lists: turning the page should dim the
   * current grid, not collapse it into skeletons and jump the scroll.
   */
  keepPrevious?: boolean;
};

export function usePaintings(
  filters: PaintingListFilters,
  { keepPrevious = false }: Options = {},
) {
  return useQuery({
    queryKey: queryKeys.paintings.list(filters),
    queryFn: ({ signal }) => paintingsService.getPaintings(filters, signal),
    staleTime: 30_000,
    placeholderData: keepPrevious ? (previous) => previous : undefined,
  });
}
