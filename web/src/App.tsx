import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import { router } from './routes/router';
import { settingsService } from './api/settings.api';
import { cartService } from './api/cart.api';
import { likesService } from './api/likes.api';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { setAuthorName } from './store/slices/settingsSlice';
import { setCartCount } from './store/slices/cartSlice';
import { setLikedIds } from './store/slices/likesSlice';
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

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(setLikedIds([]));
      return;
    }

    likesService
      .getMyLikedIds()
      .then((ids) => dispatch(setLikedIds(ids)))
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
