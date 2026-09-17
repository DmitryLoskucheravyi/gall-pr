import { useMutation, useQueryClient } from '@tanstack/react-query';

import { settingsService } from '../../api/settings.api';
import { queryKeys } from '../../lib/queryKeys';
import type { UpdateSettingsDto } from '../../types/settings.types';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import { apiErrorMessage } from '../../utils/apiError';

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

export function useResetAdminTelegramLinkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => settingsService.resetAdminTelegramLink(),
    onSuccess: (settings) => {
      // The response is the full row, so it belongs under the admin key only —
      // writing it to the public key would put adminTelegramChatId back into
      // the cache every storefront page reads from.
      queryClient.setQueryData(queryKeys.settings.admin, settings);
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      store.dispatch(showToast({ message: "Прив'язку бота скинуто" }));
    },
    onError: () => {
      store.dispatch(
        showToast({
          message: "Не вдалося скинути прив'язку",
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
      // See the note in useResetAdminTelegramLinkMutation — full row to the
      // admin key, and the storefront refetches its own projection.
      queryClient.setQueryData(queryKeys.settings.admin, settings);
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      store.dispatch(showToast({ message: 'Налаштування збережено' }));
    },
    onError: (error: unknown) => {
      store.dispatch(
        showToast({
          message: apiErrorMessage(error, 'Не вдалося зберегти'),
          variant: 'error',
        }),
      );
    },
  });
}
