import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query';

import { store } from '../store';
import { showToast } from '../store/slices/toastSlice';

function reportError(error: unknown, fallback: string) {
  const message =
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback;
  store.dispatch(showToast({ message, variant: 'error' }));
}

// A factory, not a module-level instance.
//
// Under Vite one shared client was correct: there was one browser, one user,
// one process. Under SSR a module-level client is shared by every request the
// server handles, which means one visitor's cached cart can be served to the
// next. So the server builds a fresh one per request and the browser keeps a
// singleton — the standard shape, and the one bug in this migration that would
// never show up in development.
export function makeQueryClient() {
  return new QueryClient({
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
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: a new client per request, never reused.
    return makeQueryClient();
  }

  // Browser: one for the life of the tab, so a re-render doesn't throw the
  // cache away.
  browserQueryClient ??= makeQueryClient();

  return browserQueryClient;
}
