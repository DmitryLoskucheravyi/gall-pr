import { lazy, Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import { router } from './routes/router';
import { useMeQuery } from './hooks/queries/useMe';
import { useAppSelector } from './store/hooks';
import Toast from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';

// Off by default: the devtools' launcher floats over the bottom-right
// corner, which is where the mobile nav bar's last tab sits. Set
// VITE_QUERY_DEVTOOLS=true in .env.local when you actually need them.
//
// Statically importing them would ship them in the production bundle even
// though they never render there. A lazy() wrapped in a build-time-false
// condition lets Vite strip the import() call entirely.
const ReactQueryDevtools =
  import.meta.env.DEV && import.meta.env.VITE_QUERY_DEVTOOLS === 'true'
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((m) => ({
          default: m.ReactQueryDevtools,
        })),
      )
    : null;

function App() {
  const isDark = useAppSelector((state) => state.theme.isDark);

  useMeQuery();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <ConfirmProvider>
      <RouterProvider router={router} />
      <Toast />
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </ConfirmProvider>
  );
}

export default App;
