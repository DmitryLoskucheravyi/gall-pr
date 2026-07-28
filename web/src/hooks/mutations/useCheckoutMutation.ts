import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ordersService } from '../../api/orders.api';
import { queryKeys } from '../../lib/queryKeys';
import type { CheckoutDto } from '../../types/order.types';

export function useCheckoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto?: CheckoutDto) => ordersService.checkout(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
    // Caller (CartPage) shows a bespoke success/error message; suppress the
    // global MutationCache fallback toast by claiming the error here.
    onError: () => {},
  });
}
