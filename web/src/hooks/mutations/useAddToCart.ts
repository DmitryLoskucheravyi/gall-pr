import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cartService } from '../../api/cart.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import type { Painting } from '../../types/painting.types';
import { apiErrorMessage, apiErrorStatus } from '../../utils/apiError';
import { flyToCart } from '../../lib/flyToCart';
import { cdnImage } from '../../utils/imageUrl';

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (painting: Painting) => cartService.addItem(painting.id),
    onSuccess: (_data, painting) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      // The painting flies from the button into the cart icon; the toast
      // follows once it has landed, so it does not cover the landing.
      void flyToCart(cdnImage(painting.cardImage, 220)).then(() =>
        store.dispatch(showToast({ message: `Додано в кошик: ${painting.title}` })),
      );
    },
    onError: (error: unknown, painting) => {
      // Sold since this page was drawn (the server refuses with 400). Not a
      // toast: the work is marked sold everywhere it is cached, and its button
      // turns into the grey "Sold" it should have been.
      if (apiErrorStatus(error) === 400) {
        const sold = (p: Painting): Painting =>
          p.id === painting.id ? { ...p, isAvailable: false, amount: 0 } : p;
        queryClient.setQueryData<Painting>(queryKeys.paintings.detail(painting.id), (p) =>
          p ? sold(p) : p,
        );
        queryClient.setQueriesData<{ data: Painting[] }>(
          { queryKey: queryKeys.paintings.lists() },
          (page) => (page?.data ? { ...page, data: page.data.map(sold) } : page),
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.paintings.all });
        return;
      }

      store.dispatch(
        showToast({
          message: apiErrorMessage(error, 'Не вдалося додати в кошик'),
          variant: 'error',
        }),
      );
    },
  });
}
