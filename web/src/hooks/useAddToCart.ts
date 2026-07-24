import { useNavigate } from 'react-router-dom';

import type { Painting } from '../types/painting.types';
import { cartService } from '../api/cart.api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCartCount } from '../store/slices/cartSlice';
import { showToast } from '../store/slices/toastSlice';

export function useAddToCart() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  return async (painting: Painting) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await cartService.addItem(painting.id);
      const cart = await cartService.getCart();
      const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      dispatch(setCartCount(count));
      dispatch(showToast({ message: `Додано в кошик: ${painting.title}` }));
    } catch (error: any) {
      dispatch(
        showToast({
          message: error?.response?.data?.message ?? 'Не вдалося додати в кошик',
          variant: 'error',
        }),
      );
    }
  };
}
