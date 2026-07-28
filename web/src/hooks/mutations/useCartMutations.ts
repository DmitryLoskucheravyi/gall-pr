import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cartService } from '../../api/cart.api';
import { queryKeys } from '../../lib/queryKeys';
import { clearGuestToken } from '../../utils/guestToken';

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paintingId: number) => cartService.removeItem(paintingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}

export function useMergeGuestCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (guestToken: string) => cartService.mergeGuestCart(guestToken),
    onSuccess: () => {
      clearGuestToken();
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.likes.all });
    },
    // Best-effort background merge right before a login redirect — stays
    // silent on failure, same as the original fire-and-forget call.
    onError: () => {},
  });
}
