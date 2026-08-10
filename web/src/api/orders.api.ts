import { api } from './client';
import type {
  CheckoutDto,
  CheckoutResponse,
  Order,
  OrderStatus,
  PaymentStatus,
  CreateCommissionDto,
} from '../types/order.types';

class OrdersService {
  async checkout(dto: CheckoutDto): Promise<CheckoutResponse> {
    const response = await api.post('/orders/checkout', dto);
    return response.data;
  }

  // Its own route, not checkout: no cart, nothing taken out of stock, and
  // nothing owed yet.
  async createCommission(dto: CreateCommissionDto): Promise<Order> {
    const response = await api.post('/orders/commission', dto);
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

  async archiveOrder(id: number): Promise<Order> {
    const response = await api.patch(`/orders/${id}/archive`);
    return response.data;
  }

  async sendStatusMail(id: number): Promise<{ message: string }> {
    const response = await api.post(`/orders/${id}/status-mail`);
    return response.data;
  }

  async sendApologyMail(id: number): Promise<{ message: string }> {
    const response = await api.post(`/orders/${id}/apology-mail`);
    return response.data;
  }

  async updateStatus(
    id: number,
    status: OrderStatus,
    trackingNumber?: string,
  ): Promise<Order> {
    const response = await api.patch(`/orders/${id}/status`, {
      status,
      trackingNumber,
    });
    return response.data;
  }

  async updatePaymentStatus(
    id: number,
    paymentStatus: PaymentStatus,
  ): Promise<Order> {
    const response = await api.patch(`/orders/${id}/payment-status`, {
      paymentStatus,
    });
    return response.data;
  }

  // Called right after signing in, alongside the cart merge and chat claim, so
  // orders placed as a guest show up in the new account's history.
  async claimGuestOrders(guestToken: string): Promise<{ claimed: number }> {
    const response = await api.post('/orders/claim-guest', { guestToken });
    return response.data;
  }

  async uploadPaymentProof(id: number, file: File): Promise<Order> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post(`/orders/${id}/payment-proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
}

export const ordersService = new OrdersService();
