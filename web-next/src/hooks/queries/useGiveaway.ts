import { useQuery } from '@tanstack/react-query';

import { giveawaysService } from '../../api/giveaways.api';
import { queryKeys } from '../../lib/queryKeys';
import { useAppSelector } from '../../store/hooks';

export function useGiveaway(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.giveaways.detail(id ?? 0),
    queryFn: () => giveawaysService.getGiveaway(id as number),
    enabled: !!id,
  });
}

export function useGiveawayMyStatus(id: number | undefined) {
  const userId = useAppSelector((state) => state.auth.user?.id);

  return useQuery({
    queryKey: queryKeys.giveaways.myStatus(id ?? 0, userId ?? null),
    queryFn: () => giveawaysService.getMyStatus(id as number),
    enabled: !!id && !!userId,
    meta: { silent: true },
  });
}
