import { useMutation, useQueryClient } from '@tanstack/react-query';

import { settingsService } from '../../api/settings.api';
import { queryKeys } from '../../lib/queryKeys';
import type { UpdateSettingsDto } from '../../types/settings.types';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';

export function useAdminTelegramLinkMutation() {
  return useMutation({
    mutationFn: () => settingsService.generateAdminTelegramLinkCode(),
    onError: () => {
      store.dispatch(
        showToast({
          message: 'Не вдалося згенерувати посилання. Спробуйте ще раз',
          variant: 'error',
        }),
      );
    },
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateSettingsDto) => settingsService.updateSettings(dto),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.settings.all, settings);
      store.dispatch(showToast({ message: 'Налаштування збережено' }));
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message: error?.response?.data?.message ?? 'Не вдалося зберегти',
          variant: 'error',
        }),
      );
    },
  });
}
