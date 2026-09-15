import { useQuery } from '@tanstack/react-query';

import { settingsService } from '../../api/settings.api';
import { queryKeys } from '../../lib/queryKeys';
import { useLocale } from '../useLocale';
import { pickLocale } from '../../utils/localizedField';

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => settingsService.getSettings(),
    staleTime: 5 * 60_000,
  });
}

// The full row, admin-only. Kept under its own query key so the storefront's
// cache never holds the admin fields — and so a 403 for a non-admin can't
// evict the public settings every page depends on.
export function useAdminSettings() {
  return useQuery({
    queryKey: queryKeys.settings.admin,
    queryFn: () => settingsService.getAdminSettings(),
    staleTime: 5 * 60_000,
  });
}

export function useAuthorName(): string {
  const { data } = useSettings();
  const locale = useLocale();
  if (!data) return '';
  return pickLocale(data, 'authorName', locale);
}

export function useCardTransferIban(): string {
  const { data } = useSettings();
  return data?.cardTransferIban ?? '';
}

export function useSupportTelegramUrl(): string {
  const { data } = useSettings();
  return data?.supportTelegramUrl ?? '';
}
