import { useQuery } from '@tanstack/react-query';

import { ordersService } from '../../api/orders.api';
import { queryKeys } from '../../lib/queryKeys';
import { useAppSelector } from '../../store/hooks';
import type { AdminOrderTab } from '../../types/order.types';

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

export function useAdminOrders(tab: AdminOrderTab, page: number) {
  return useQuery({
    queryKey: queryKeys.orders.admin(tab, page),
    queryFn: () => ordersService.getAllOrders(tab, page),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    // Paging shouldn't blank the table — keep the previous page on screen
    // while the next one loads.
    placeholderData: (previous) => previous,
  });
}

// How many orders are waiting, across the whole table.
//
// This used to fetch every order and count the PENDING ones in the browser,
// which stopped being possible once the list was paginated — a page of
// twenty-five cannot answer a question about all of them. The server counts
// instead, and this asks for the smallest page it can to get the number.
export function useAdminPendingOrdersCount(): number {
  const isAdmin = useAppSelector((state) => state.auth.user?.role === 'ADMIN');

  const { data } = useQuery({
    queryKey: queryKeys.orders.adminPendingCount(),
    queryFn: () => ordersService.getAllOrders('active', 1, 1),
    enabled: isAdmin,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    select: (result) => result.pendingTotal,
  });

  return data ?? 0;
}
