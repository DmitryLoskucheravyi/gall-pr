'use client';

import { useCallback } from 'react';

import { supportService } from '../api/support.api';
import { ordersService } from '../api/orders.api';
import { useMergeGuestCartMutation } from './mutations/useCartMutations';
import { useLocalizedNavigate } from './useLocalizedNavigate';
import { useAppDispatch } from '../store/hooks';
import { setAuth } from '../store/slices/authSlice';
import { peekGuestToken } from '../utils/guestToken';
import type { AuthResponse } from '../types/auth.types';

// What happens after any way in — password, registration, Google — succeeds.
// One place, so a new way in cannot forget a step.
export function useFinishSignIn() {
  const dispatch = useAppDispatch();
  const navigate = useLocalizedNavigate();
  const mergeGuestCart = useMergeGuestCartMutation();

  return useCallback(
    async (auth: AuthResponse) => {
      dispatch(setAuth(auth));

      // Whatever this browser did as a guest — a cart, a support thread, past
      // orders — follows them into the account. Orders are claimed before the
      // cart merge, which clears the guest token on success.
      const guestToken = peekGuestToken();
      if (guestToken) {
        await ordersService.claimGuestOrders(guestToken).catch(() => {});
        await mergeGuestCart.mutateAsync(guestToken).catch(() => {});
        await supportService.claimGuestChat(guestToken).catch(() => {});
      }

      navigate('/');
    },
    [dispatch, navigate, mergeGuestCart],
  );
}
