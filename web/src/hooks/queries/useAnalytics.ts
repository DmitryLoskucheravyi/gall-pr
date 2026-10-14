import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { analyticsService } from '../../api/analytics.api';
import { queryKeys } from '../../lib/queryKeys';
import type { AnalyticsPeriod } from '../../types/analytics.types';

export function useAnalyticsOverview(days: AnalyticsPeriod) {
  return useQuery({
    queryKey: queryKeys.analytics.overview(days),
    queryFn: () => analyticsService.getOverview(days),
    // Switching period keeps the last one on screen until the next arrives,
    // so the charts change rather than blink out.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
