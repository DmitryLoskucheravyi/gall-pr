import { useQuery } from '@tanstack/react-query';

import { ordersService } from '../../api/orders.api';
import { queryKeys } from '../../lib/queryKeys';
import { useAppSelector } from '../../store/hooks';
import type { Order } from '../../types/order.types';

export function useOrdersIdentity(): number | 'guest' {
  const userId = useAppSelector((state) => state.auth.user?.id);
  return userId ?? 'guest';
}

export function useMyOrders() {
  const identity = useOrdersIdentity();

  return useQuery({
    queryKey: queryKeys.orders.mine(identity),
    queryFn: () => ordersService.getOrders(),
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

function countPending(orders: Order[]) {
  return orders.filter((order) => order.status === 'PENDING').length;
}

export function useAdminPendingOrdersCount(): number {
  const isAdmin = useAppSelector((state) => state.auth.user?.role === 'ADMIN');

  const { data } = useQuery({
    queryKey: queryKeys.orders.admin(),
    queryFn: () => ordersService.getAllOrders(),
    enabled: isAdmin,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    select: countPending,
  });

  return data ?? 0;
}
