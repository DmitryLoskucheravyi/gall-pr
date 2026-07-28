import { useQuery } from '@tanstack/react-query';

import { ordersService } from '../../api/orders.api';
import { queryKeys } from '../../lib/queryKeys';
import { useAppSelector } from '../../store/hooks';

export function useMyOrders() {
  const userId = useAppSelector((state) => state.auth.user?.id);

  return useQuery({
    queryKey: queryKeys.orders.mine(userId ?? 0),
    queryFn: () => ordersService.getOrders(),
    enabled: !!userId,
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: queryKeys.orders.admin(),
    queryFn: () => ordersService.getAllOrders(),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}
