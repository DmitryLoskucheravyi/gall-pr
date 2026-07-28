import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query';

import { store } from '../store';
import { showToast } from '../store/slices/toastSlice';

function reportError(error: unknown, fallback: string) {
  const message =
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback;
  store.dispatch(showToast({ message, variant: 'error' }));
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const meta = query.meta as { silent?: boolean } | undefined;
      if (meta?.silent) return;
      reportError(error, 'Не вдалося завантажити дані');
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.options.onError) return;
      reportError(error, 'Не вдалося виконати дію');
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
