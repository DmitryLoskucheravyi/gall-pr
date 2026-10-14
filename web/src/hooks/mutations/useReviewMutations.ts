import { useMutation, useQueryClient } from '@tanstack/react-query';
import i18n from '../../i18n';

import { reviewsService } from '../../api/reviews.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import type { CreateReviewDto, UpdateReviewDto } from '../../types/review.types';
import { apiErrorMessage } from '../../utils/apiError';

const toastError = (fallbackKey: string) => (error: unknown) =>
  store.dispatch(
    showToast({
      message: apiErrorMessage(error, i18n.t(fallbackKey)),
      variant: 'error',
    }),
  );

// The customer's review. On success the orders refetch, so every place that
// shows the order — the orders page, the profile, the prompt — sees the
// review in place of the button.
export function useCreateReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateReviewDto) => reviewsService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.admin });
    },
    onError: toastError('orders:review.failed'),
  });
}

export function useUpdateReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateReviewDto }) =>
      reviewsService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
      store.dispatch(showToast({ message: i18n.t('admin:reviewsPage.saved') }));
    },
    onError: toastError('admin:reviewsPage.saveFailed'),
  });
}

export function useDeleteReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => reviewsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
    onError: toastError('admin:reviewsPage.saveFailed'),
  });
}
