import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';

import './styles/global.scss';
import './i18n';
import App from './App.tsx';
import { store } from './store';
import { queryClient } from './lib/queryClient';
import { bootstrapAuth } from './auth/bootstrap';

// Kicked off before render rather than awaited: the catalogue, the hero and
// everything else public should paint immediately for a visitor who isn't
// signed in — which is most of them. App holds back only the parts that
// actually depend on knowing who you are.
void bootstrapAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <App />
      </Provider>
    </QueryClientProvider>
  </StrictMode>,
);
