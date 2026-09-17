import { useQuery } from '@tanstack/react-query';

import { likesService } from '../../api/likes.api';
import { queryKeys } from '../../lib/queryKeys';
import { useAppSelector } from '../../store/hooks';

export function useLikedPaintings() {
  const userId = useAppSelector((state) => state.auth.user?.id);

  return useQuery({
    queryKey: queryKeys.likes.myPaintings(userId ?? 0),
    queryFn: () => likesService.getMyLikedPaintings(),
    enabled: !!userId,
  });
}
