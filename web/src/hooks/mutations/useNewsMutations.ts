import { useMutation, useQueryClient } from '@tanstack/react-query';

import { newsService } from '../../api/news.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import type { CreateNewsDto } from '../../types/news.types';
import { apiErrorMessage } from '../../utils/apiError';

function onSaveError(error: unknown) {
  store.dispatch(
    showToast({
      message: apiErrorMessage(error, 'Не вдалося зберегти'),
      variant: 'error',
    }),
  );
}

export function useCreateNewsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateNewsDto) => newsService.createNews(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.news.list() });
      store.dispatch(showToast({ message: 'Збережено' }));
    },
    onError: onSaveError,
  });
}

export function useUpdateNewsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateNewsDto> }) =>
      newsService.updateNews(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.news.list() });
      store.dispatch(showToast({ message: 'Збережено' }));
    },
    onError: onSaveError,
  });
}

export function useDeleteNewsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => newsService.deleteNews(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.news.list() });
      store.dispatch(showToast({ message: 'Новину видалено' }));
    },
    onError: (error: unknown) => {
      store.dispatch(
        showToast({
          message: apiErrorMessage(error, 'Не вдалося видалити'),
          variant: 'error',
        }),
      );
    },
  });
}
