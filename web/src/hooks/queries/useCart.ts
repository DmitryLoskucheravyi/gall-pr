import { useQuery } from '@tanstack/react-query';

import { cartService } from '../../api/cart.api';
import { queryKeys } from '../../lib/queryKeys';
import { useAppSelector } from '../../store/hooks';
import type { CartResponse } from '../../types/cart.types';

export function useCartIdentity(): number | 'guest' {
  const userId = useAppSelector((state) => state.auth.user?.id);
  return userId ?? 'guest';
}

export function useCart() {
  const identity = useCartIdentity();

  return useQuery({
    queryKey: queryKeys.cart.detail(identity),
    queryFn: () => cartService.getCart(),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

function sumQuantity(cart: CartResponse) {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function useCartCount(): number {
  const identity = useCartIdentity();

  const { data } = useQuery({
    queryKey: queryKeys.cart.detail(identity),
    queryFn: () => cartService.getCart(),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    select: sumQuantity,
  });

  return data ?? 0;
}
