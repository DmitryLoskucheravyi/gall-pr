import { useQuery } from '@tanstack/react-query';

import { paymentsService } from '../../api/payments.api';
import type { PaymentProvider } from '../../types/order.types';

// Server configuration, not user data: it changes when someone edits .env and
// restarts, which is to say never, during a visit.
export function useOnlinePaymentMethods() {
  return useQuery<PaymentProvider[]>({
    queryKey: ['payments', 'methods'],
    queryFn: () => paymentsService.availableOnline(),
    staleTime: 60 * 60 * 1000,
    // An unreachable API shouldn't wipe the manual options off the page — the
    // cart falls back to those, which need no gateway at all.
    retry: 1,
  });
}
