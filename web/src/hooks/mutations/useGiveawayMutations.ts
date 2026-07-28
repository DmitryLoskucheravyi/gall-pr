import { useMutation, useQueryClient } from '@tanstack/react-query';

import { giveawaysService } from '../../api/giveaways.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import type { CreateGiveawayDto } from '../../types/giveaway.types';

function onSaveError(error: any) {
  store.dispatch(
    showToast({
      message: error?.response?.data?.message ?? 'Не вдалося зберегти',
      variant: 'error',
    }),
  );
}

export function useCreateGiveawayMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateGiveawayDto) => giveawaysService.createGiveaway(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.giveaways.lists() });
      store.dispatch(showToast({ message: 'Збережено' }));
    },
    onError: onSaveError,
  });
}

export function useUpdateGiveawayMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateGiveawayDto> }) =>
      giveawaysService.updateGiveaway(id, dto),
    onSuccess: (giveaway) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.giveaways.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.giveaways.detail(giveaway.id),
      });
      store.dispatch(showToast({ message: 'Збережено' }));
    },
    onError: onSaveError,
  });
}

export function useDeleteGiveawayMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => giveawaysService.deleteGiveaway(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.giveaways.lists() });
      store.dispatch(showToast({ message: 'Розіграш видалено' }));
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message: error?.response?.data?.message ?? 'Не вдалося видалити',
          variant: 'error',
        }),
      );
    },
  });
}
