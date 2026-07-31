import { api } from './client';
import type { FaqMap } from '../types/faq.types';

class FaqService {
  async getFaq(): Promise<FaqMap> {
    const response = await api.get('/settings/faq');
    return response.data;
  }

  async createItem(dto: { title: string; text: string }): Promise<FaqMap> {
    const response = await api.post('/settings/faq', dto);
    return response.data;
  }

  async updateItem(
    id: string,
    dto: { title?: string; text?: string },
  ): Promise<FaqMap> {
    const response = await api.patch(`/settings/faq/${id}`, dto);
    return response.data;
  }

  async deleteItem(id: string): Promise<FaqMap> {
    const response = await api.delete(`/settings/faq/${id}`);
    return response.data;
  }

  async reorder(order: Record<string, number>): Promise<FaqMap> {
    const response = await api.patch('/settings/faq/reorder', { order });
    return response.data;
  }
}

export const faqService = new FaqService();
