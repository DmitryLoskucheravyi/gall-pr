import { create } from 'zustand';

import { cartService } from '../api/cart.api';

type CartStore = {
  count: number;
  refresh: () => Promise<void>;
  reset: () => void;
};

export const useCartStore = create<CartStore>((set) => ({
  count: 0,

  refresh: async () => {
    try {
      const cart = await cartService.getCart();
      const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      set({ count });
    } catch {
      set({ count: 0 });
    }
  },

  reset: () => set({ count: 0 }),
}));
