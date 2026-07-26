import type { Painting } from '../types/painting.types';
import { cartService } from '../api/cart.api';
import { useAppDispatch } from '../store/hooks';
import { setCartCount } from '../store/slices/cartSlice';
import { showToast } from '../store/slices/toastSlice';

export function useAddToCart() {
  const dispatch = useAppDispatch();

  return async (painting: Painting) => {
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
