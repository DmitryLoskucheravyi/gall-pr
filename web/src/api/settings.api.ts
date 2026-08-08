import { api } from './client';
import type {
  AppSettings,
  PublicAppSettings,
  UpdateSettingsDto,
} from '../types/settings.types';

class SettingsService {
  // Open to everyone, and returns only the storefront's fields.
  async getSettings(): Promise<PublicAppSettings> {
    const response = await api.get('/settings');
    return response.data;
  }

  // Admin-only, and the only place the full row is available.
  async getAdminSettings(): Promise<AppSettings> {
    const response = await api.get('/settings/admin');
    return response.data;
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<AppSettings> {
    const response = await api.patch('/settings', dto);
    return response.data;
  }

  async generateAdminTelegramLinkCode(): Promise<{ code: string; expiresAt: string }> {
    const response = await api.post('/settings/telegram-link-code');
    return response.data;
  }

  async resetAdminTelegramLink(): Promise<AppSettings> {
    const response = await api.delete('/settings/telegram-link');
    return response.data;
  }
}

export const settingsService = new SettingsService();
