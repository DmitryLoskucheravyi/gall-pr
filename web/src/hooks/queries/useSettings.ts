import { useQuery } from '@tanstack/react-query';

import { settingsService } from '../../api/settings.api';
import { queryKeys } from '../../lib/queryKeys';

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => settingsService.getSettings(),
    staleTime: 5 * 60_000,
  });
}

export function useAuthorName(): string {
  const { data } = useSettings();
  return data?.authorName ?? '';
}

export function useCardTransferIban(): string {
  const { data } = useSettings();
  return data?.cardTransferIban ?? '';
}
