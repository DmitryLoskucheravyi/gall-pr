import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import { router } from './routes/router';
import { settingsService } from './api/settings.api';
import { cartService } from './api/cart.api';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { setAuthorName } from './store/slices/settingsSlice';
import { setCartCount } from './store/slices/cartSlice';
import Toast from './components/ui/Toast';

function App() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isDark = useAppSelector((state) => state.theme.isDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    settingsService
      .getSettings()
      .then((settings) => dispatch(setAuthorName(settings.authorName)))
      .catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(setCartCount(0));
      return;
    }

    cartService
      .getCart()
      .then((cart) =>
        dispatch(
          setCartCount(
            cart.items.reduce((sum, item) => sum + item.quantity, 0),
          ),
        ),
      )
      .catch(() => {});
  }, [isAuthenticated, dispatch]);

  return (
    <>
      <RouterProvider router={router} />
      <Toast />
    </>
  );
}

export default App;
