import { api } from './client';
import type { Painting, PaintingsResponse } from '../types/painting.types';
import type { CreatePaintingDto } from '../types/create-painting.types';

class PaintingsService {
  async getPaintings(
    page = 1,
    limit = 12,
    techniqueId?: number,
    isAvailable?: boolean,
    minPrice?: number,
    maxPrice?: number,
    signal?: AbortSignal,
  ): Promise<PaintingsResponse> {
    const response = await api.get('/paintings', {
      params: { page, limit, techniqueId, isAvailable, minPrice, maxPrice },
      signal,
    });
    return response.data;
  }

  async getPriceRange(signal?: AbortSignal): Promise<{ min: number; max: number }> {
    const response = await api.get('/paintings/price-range', { signal });
    return response.data;
  }

  async getPainting(id: number, signal?: AbortSignal): Promise<Painting> {
    const response = await api.get(`/paintings/${id}`, { signal });
    return response.data;
  }

  async createPainting(data: CreatePaintingDto): Promise<Painting> {
    const response = await api.post('/paintings', data);
    return response.data;
  }

  async updatePainting(
    id: number,
    data: Partial<CreatePaintingDto>,
  ): Promise<Painting> {
    const response = await api.patch(`/paintings/${id}`, data);
    return response.data;
  }

  async deletePainting(id: number) {
    const response = await api.delete(`/paintings/${id}`);
    return response.data;
  }
}

export const paintingsService = new PaintingsService();
