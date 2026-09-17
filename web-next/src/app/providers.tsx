'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n';
import { store } from '@/store';
import { getQueryClient } from '@/lib/queryClient';
import { bootstrapAuth } from '@/auth/bootstrap';
import ErrorBoundary from '@/components/ErrorBoundary';
import Toast from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import type { Locale } from '@/utils/locale';

// Everything the app needs on the client, in one boundary.
//
// It takes the locale as a prop rather than reading it from a hook: the root
// layout is a Server Component and already has it from `params`, and passing it
// down means i18next is on the right language during the server render too —
// otherwise the server would render Ukrainian, the client would switch to
// English, and React would throw the server pass away as a hydration mismatch.
export default function Providers({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  // Created once per mount, never at module scope — see getQueryClient.
  const [queryClient] = useState(getQueryClient);

  // Synchronously, not in an effect: an effect runs after the first render, by
  // which point the wrong language is already on screen.
  if (i18n.language !== locale) {
    void i18n.changeLanguage(locale);
  }

  useEffect(() => {
    // Re-establishes the session from the refresh cookie. Fired once on mount
    // rather than awaited before render: the catalogue, the hero and everything
    // else public should paint immediately for a visitor who isn't signed in,
    // which is most of them.
    void bootstrapAuth();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <I18nextProvider i18n={i18n}>
            <ConfirmProvider>
              {children}
              <Toast />
            </ConfirmProvider>
          </I18nextProvider>
        </Provider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
