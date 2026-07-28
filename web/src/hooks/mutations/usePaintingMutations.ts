import { useMutation, useQueryClient } from '@tanstack/react-query';

import { paintingsService } from '../../api/paintings.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import type { Painting } from '../../types/painting.types';
import type { CreatePaintingDto } from '../../types/create-painting.types';

const isRelatedKey = (query: { queryKey: readonly unknown[] }) =>
  query.queryKey[1] === 'related';

export function useCreatePaintingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaintingDto) => paintingsService.createPainting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paintings.lists() });
    },
    // CreatePaintingForm shows the error inline in the modal; suppress the
    // global MutationCache fallback toast to avoid a redundant message.
    onError: () => {},
  });
}

export function useUpdatePaintingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreatePaintingDto> }) =>
      paintingsService.updatePainting(id, data),
    onSuccess: (painting) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paintings.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.paintings.detail(painting.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.paintings.all,
        predicate: isRelatedKey,
      });
    },
    onError: () => {},
  });
}

export function useDeletePaintingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (painting: Painting) =>
      paintingsService.deletePainting(painting.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paintings.lists() });
      store.dispatch(showToast({ message: 'Картину видалено' }));
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message: error?.response?.data?.message ?? 'Не вдалося видалити картину',
          variant: 'error',
        }),
      );
    },
  });
}
