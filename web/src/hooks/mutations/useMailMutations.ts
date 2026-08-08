import { useMutation, useQueryClient } from '@tanstack/react-query';

import { mailService } from '../../api/mail.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';

export function useRetryMailMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => mailService.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mail.all });
      store.dispatch(showToast({ message: 'Лист поставлено в чергу' }));
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message:
            error?.response?.data?.message ?? 'Не вдалося поставити лист у чергу',
          variant: 'error',
        }),
      );
    },
  });
}

export function useClearSettledMailMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mailService.clearSettled(),
    onSuccess: ({ removed }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mail.all });
      store.dispatch(showToast({ message: `Прибрано записів: ${removed}` }));
    },
    onError: () => {
      store.dispatch(
        showToast({ message: 'Не вдалося очистити журнал', variant: 'error' }),
      );
    },
  });
}
