import { api } from './client';
import type {
  Series,
  SeriesInput,
  SeriesWithPaintings,
} from '../types/series.types';

class SeriesService {
  // Published series only. The admin list is its own route rather than a flag
  // on this one — see the note on the controller.
  async getSeries(): Promise<Series[]> {
    const response = await api.get('/series');
    return response.data;
  }

  // Every published series with its works already attached, so the catalogue's
  // "Серії" tab costs one request rather than one per series.
  async getShowcase(signal?: AbortSignal): Promise<SeriesWithPaintings[]> {
    const response = await api.get('/series/showcase', { signal });
    return response.data;
  }

  async getSeriesForAdmin(): Promise<Series[]> {
    const response = await api.get('/series/admin');
    return response.data;
  }

  async createSeries(input: SeriesInput): Promise<Series> {
    const response = await api.post('/series', input);
    return response.data;
  }

  async updateSeries(id: number, input: Partial<SeriesInput>): Promise<Series> {
    const response = await api.patch(`/series/${id}`, input);
    return response.data;
  }

  // Replaces the series' membership wholesale rather than adding to it.
  async setPaintings(id: number, paintingIds: number[]): Promise<Series> {
    const response = await api.put(`/series/${id}/paintings`, { paintingIds });
    return response.data;
  }

  async deleteSeries(id: number) {
    const response = await api.delete(`/series/${id}`);
    return response.data;
  }
}

export const seriesService = new SeriesService();
