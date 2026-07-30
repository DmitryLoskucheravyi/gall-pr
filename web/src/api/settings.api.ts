import { api } from './client';
import type { AppSettings, UpdateSettingsDto } from '../types/settings.types';

class SettingsService {
  async getSettings(): Promise<AppSettings> {
    const response = await api.get('/settings');
    return response.data;
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<AppSettings> {
    const response = await api.patch('/settings', dto);
    return response.data;
  }
}

export const settingsService = new SettingsService();
