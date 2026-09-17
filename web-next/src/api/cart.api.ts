import { api } from './client';
import type { CartResponse } from '../types/cart.types';

class CartService {
  async getCart(): Promise<CartResponse> {
    const response = await api.get('/cart');
    return response.data;
  }

  async addItem(paintingId: number, quantity = 1) {
    const response = await api.post('/cart', { paintingId, quantity });
    return response.data;
  }

  async removeItem(paintingId: number) {
    const response = await api.delete(`/cart/${paintingId}`);
    return response.data;
  }

  async clearCart() {
    const response = await api.delete('/cart');
    return response.data;
  }

  async mergeGuestCart(guestToken: string) {
    const response = await api.post('/cart/merge', { guestToken });
    return response.data;
  }
}

export const cartService = new CartService();
