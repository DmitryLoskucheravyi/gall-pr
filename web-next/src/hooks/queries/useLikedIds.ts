import { useQuery } from '@tanstack/react-query';

import { likesService } from '../../api/likes.api';
import { queryKeys } from '../../lib/queryKeys';
import { useAppSelector } from '../../store/hooks';

export function useLikedIds() {
  const userId = useAppSelector((state) => state.auth.user?.id);

  return useQuery({
    queryKey: queryKeys.likes.mine(userId ?? 0),
    queryFn: () => likesService.getMyLikedIds(),
    enabled: !!userId,
    staleTime: 15_000,
  });
}

export function useIsLiked(paintingId: number): boolean {
  const { data: likedIds } = useLikedIds();
  return likedIds?.includes(paintingId) ?? false;
}
