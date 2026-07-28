import { useMutation, useQueryClient } from '@tanstack/react-query';

import { settingsService } from '../../api/settings.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (authorName: string) => settingsService.updateSettings(authorName),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.settings.all, settings);
      store.dispatch(showToast({ message: 'Автора оновлено на всіх картинах' }));
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
