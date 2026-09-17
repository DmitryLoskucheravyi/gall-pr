import { api } from './client';
import type { CreateGiveawayDto, Giveaway } from '../types/giveaway.types';

class GiveawaysService {
  async getGiveaways(): Promise<Giveaway[]> {
    const response = await api.get('/giveaways');
    return response.data;
  }

  async getGiveaway(id: number): Promise<Giveaway> {
    const response = await api.get(`/giveaways/${id}`);
    return response.data;
  }

  async getMyStatus(id: number): Promise<{ joined: boolean }> {
    const response = await api.get(`/giveaways/${id}/my-status`);
    return response.data;
  }

  async join(id: number): Promise<{ joined: boolean; participantsCount: number }> {
    const response = await api.post(`/giveaways/${id}/join`);
    return response.data;
  }

  async createGiveaway(dto: CreateGiveawayDto): Promise<Giveaway> {
    const response = await api.post('/giveaways', dto);
    return response.data;
  }

  async updateGiveaway(
    id: number,
    dto: Partial<CreateGiveawayDto>,
  ): Promise<Giveaway> {
    const response = await api.patch(`/giveaways/${id}`, dto);
    return response.data;
  }

  async deleteGiveaway(id: number) {
    const response = await api.delete(`/giveaways/${id}`);
    return response.data;
  }
}

export const giveawaysService = new GiveawaysService();
