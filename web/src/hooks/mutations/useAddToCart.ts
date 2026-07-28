import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cartService } from '../../api/cart.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import type { Painting } from '../../types/painting.types';

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (painting: Painting) => cartService.addItem(painting.id),
    onSuccess: (_data, painting) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      store.dispatch(showToast({ message: `Додано в кошик: ${painting.title}` }));
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message: error?.response?.data?.message ?? 'Не вдалося додати в кошик',
          variant: 'error',
        }),
      );
    },
  });
}
