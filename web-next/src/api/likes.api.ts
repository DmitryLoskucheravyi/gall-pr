import { api } from './client';
import type { Painting } from '../types/painting.types';

type ToggleLikeResponse = {
  liked: boolean;
  likesCount: number;
};

class LikesService {
  async toggleLike(paintingId: number): Promise<ToggleLikeResponse> {
    const response = await api.post(`/likes/${paintingId}`);
    return response.data;
  }

  async getMyLikedIds(): Promise<number[]> {
    const response = await api.get('/likes/mine');
    return response.data;
  }

  async getMyLikedPaintings(): Promise<Painting[]> {
    const response = await api.get('/likes/paintings');
    return response.data;
  }
}

export const likesService = new LikesService();
