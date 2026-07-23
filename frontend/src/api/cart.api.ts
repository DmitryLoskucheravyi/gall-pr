import { api } from './index';

import { CartResponse } from '../types/cart.types';

class CartService {
  async getCart(): Promise<CartResponse> {
    const response = await api.get('/cart');
    return response.data;
  }

  async addItem(paintingId: number, quantity = 1) {
    const response = await api.post('/cart', { paintingId, quantity });
    return response.data;
  }

  async updateItem(paintingId: number, quantity: number) {
    const response = await api.patch(`/cart/${paintingId}`, { quantity });
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
}

export const cartService = new CartService();
