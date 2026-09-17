import { useQuery } from '@tanstack/react-query';

import { seriesService } from '../../api/series.api';
import { queryKeys } from '../../lib/queryKeys';

// Published series, without their paintings — for pickers and selects.
export function useSeries() {
  return useQuery({
    queryKey: queryKeys.series.list(),
    queryFn: () => seriesService.getSeries(),
    staleTime: 5 * 60_000,
  });
}

// The catalogue's "Серії" tab: each series with the row of works under it.
// `enabled` so the request only goes out when that tab is actually open.
export function useSeriesShowcase(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.series.showcase(),
    queryFn: ({ signal }) => seriesService.getShowcase(signal),
    enabled,
    staleTime: 60_000,
  });
}

// Everything, unpublished included. Admin-only route, so it is only asked for
// on admin screens.
export function useAdminSeries(enabled = true) {
  return useQuery({
    queryKey: queryKeys.series.admin(),
    queryFn: () => seriesService.getSeriesForAdmin(),
    enabled,
    staleTime: 30_000,
  });
}
