import { useMutation, useQueryClient } from '@tanstack/react-query';

import { giveawaysService } from '../../api/giveaways.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import { useAppSelector } from '../../store/hooks';
import type { Giveaway } from '../../types/giveaway.types';

export function useGiveawayJoinMutation() {
  const queryClient = useQueryClient();
  const userId = useAppSelector((state) => state.auth.user?.id);

  return useMutation({
    mutationFn: (giveawayId: number) => giveawaysService.join(giveawayId),
    onSuccess: (result, giveawayId) => {
      queryClient.setQueryData<Giveaway>(
        queryKeys.giveaways.detail(giveawayId),
        (old) => (old ? { ...old, participantsCount: result.participantsCount } : old),
      );

      if (userId) {
        queryClient.setQueryData(queryKeys.giveaways.myStatus(giveawayId, userId), {
          joined: true,
        });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.giveaways.lists() });
      store.dispatch(showToast({ message: 'Ви берете участь у розіграші!' }));
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message: error?.response?.data?.message ?? 'Не вдалося приєднатись',
          variant: 'error',
        }),
      );
    },
  });
}
