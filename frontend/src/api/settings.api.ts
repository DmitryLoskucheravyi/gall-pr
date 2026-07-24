import { api } from './index';

import { AppSettings } from '../types/settings.types';

class SettingsService {
  async getSettings(): Promise<AppSettings> {
    const response = await api.get('/settings');
    return response.data;
  }

  async updateSettings(authorName: string): Promise<AppSettings> {
    const response = await api.patch('/settings', { authorName });
    return response.data;
  }
}

export const settingsService = new SettingsService();
