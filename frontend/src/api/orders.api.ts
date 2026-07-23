import { api } from './index';

import { Order, OrderStatus } from '../types/order.types';

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

  async cancelOrder(id: number): Promise<Order> {
    const response = await api.patch(`/orders/${id}/cancel`);
    return response.data;
  }

  async getAllOrders(): Promise<Order[]> {
    const response = await api.get('/orders/all');
    return response.data;
  }

  async deleteOrder(id: number) {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  }

  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    const response = await api.patch(`/orders/${id}/status`, { status });
    return response.data;
  }
}

export const ordersService = new OrdersService();
