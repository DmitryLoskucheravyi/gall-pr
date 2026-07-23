import { api } from './index';

import { Order } from '../types/order.types';

class OrdersService {
  async checkout(): Promise<Order> {
    const response = await api.post('/orders/checkout');
    return response.data;
  }

  async getOrders(): Promise<Order[]> {
    const response = await api.get('/orders');
    return response.data;
  }

  async getOrder(id: number): Promise<Order> {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  }
}

export const ordersService = new OrdersService();
