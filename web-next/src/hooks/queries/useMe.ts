import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { authService } from '../../api/auth.api';
import { queryKeys } from '../../lib/queryKeys';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setUser } from '../../store/slices/authSlice';

export function useMeQuery() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const userId = useAppSelector((state) => state.auth.user?.id);

  const query = useQuery({
    queryKey: queryKeys.auth.me(userId ?? 0),
    queryFn: () => authService.getProfile(),
    enabled: isAuthenticated,
    meta: { silent: true },
  });

  useEffect(() => {
    if (query.data) dispatch(setUser(query.data));
  }, [query.data, dispatch]);

  return query;
}
