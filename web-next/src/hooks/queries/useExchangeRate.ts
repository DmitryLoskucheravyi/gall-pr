import { useQuery } from '@tanstack/react-query';

import { exchangeRateService } from '../../api/exchangeRate.api';
import { queryKeys } from '../../lib/queryKeys';

// The rate itself only refreshes hourly on the backend, so there's nothing to
// gain from polling more often here — just re-check once an hour.
export function useExchangeRate() {
  return useQuery({
    queryKey: queryKeys.exchangeRate.all,
    queryFn: () => exchangeRateService.getUsdToUahRate(),
    staleTime: 60 * 60_000,
  });
}
