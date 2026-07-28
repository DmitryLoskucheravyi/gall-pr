import { useMutation, useQueryClient } from '@tanstack/react-query';

import { likesService } from '../../api/likes.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import { useAppSelector } from '../../store/hooks';
import type { Painting, PaintingsResponse } from '../../types/painting.types';

function patchLikes(painting: Painting, paintingId: number, delta: number): Painting {
  if (painting.id !== paintingId) return painting;
  return { ...painting, likesCount: Math.max(0, painting.likesCount + delta) };
}

const isListShapedKey = (query: { queryKey: readonly unknown[] }) =>
  query.queryKey[1] === 'list' || query.queryKey[1] === 'related';

export function useLikeMutation() {
  const queryClient = useQueryClient();
  const userId = useAppSelector((state) => state.auth.user?.id);

  return useMutation({
    mutationFn: (paintingId: number) => likesService.toggleLike(paintingId),

    onMutate: async (paintingId: number) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.paintings.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.likes.all });

      const listSnapshots = queryClient.getQueriesData<PaintingsResponse>({
        queryKey: queryKeys.paintings.all,
        predicate: isListShapedKey,
      });
      const detailSnapshot = queryClient.getQueryData<Painting>(
        queryKeys.paintings.detail(paintingId),
      );
      const likedIdsSnapshot = userId
        ? queryClient.getQueryData<number[]>(queryKeys.likes.mine(userId))
        : undefined;

      const wasLiked = likedIdsSnapshot?.includes(paintingId) ?? false;
      const delta = wasLiked ? -1 : 1;

      queryClient.setQueriesData<PaintingsResponse>(
        { queryKey: queryKeys.paintings.all, predicate: isListShapedKey },
        (old) =>
          old && {
            ...old,
            data: old.data.map((item) => patchLikes(item, paintingId, delta)),
          },
      );

      queryClient.setQueryData<Painting>(
        queryKeys.paintings.detail(paintingId),
        (old) => old && patchLikes(old, paintingId, delta),
      );

      if (userId) {
        queryClient.setQueryData<number[]>(queryKeys.likes.mine(userId), (old) => {
          const ids = old ?? [];
          return wasLiked ? ids.filter((id) => id !== paintingId) : [...ids, paintingId];
        });
      }

      return { listSnapshots, detailSnapshot, likedIdsSnapshot, paintingId };
    },

    onError: (error: any, _paintingId, context) => {
      if (context) {
        context.listSnapshots.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
        queryClient.setQueryData(
          queryKeys.paintings.detail(context.paintingId),
          context.detailSnapshot,
        );
        if (userId && context.likedIdsSnapshot !== undefined) {
          queryClient.setQueryData(queryKeys.likes.mine(userId), context.likedIdsSnapshot);
        }
      }

      store.dispatch(
        showToast({
          message: error?.response?.data?.message ?? 'Не вдалося оновити лайк',
          variant: 'error',
        }),
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paintings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.likes.all });
    },
  });
}
