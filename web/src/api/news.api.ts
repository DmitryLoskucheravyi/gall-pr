import { api } from './client';
import type { CreateNewsDto, News } from '../types/news.types';

class NewsService {
  async getNews(): Promise<News[]> {
    const response = await api.get('/news');
    return response.data;
  }

  async createNews(dto: CreateNewsDto): Promise<News> {
    const response = await api.post('/news', dto);
    return response.data;
  }

  async updateNews(id: number, dto: Partial<CreateNewsDto>): Promise<News> {
    const response = await api.patch(`/news/${id}`, dto);
    return response.data;
  }

  async deleteNews(id: number) {
    const response = await api.delete(`/news/${id}`);
    return response.data;
  }
}

export const newsService = new NewsService();
