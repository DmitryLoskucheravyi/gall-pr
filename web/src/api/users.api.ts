import { api } from './client';
import type { AdminUser } from '../types/user.types';
import type { User } from '../types/auth.types';

class UsersService {
  async getUsers(): Promise<AdminUser[]> {
    const response = await api.get('/users');
    return response.data;
  }

  async deleteUser(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  }

  async generateTelegramLinkCode(): Promise<{ code: string; expiresAt: string }> {
    const response = await api.post('/users/me/telegram-link-code');
    return response.data;
  }

  async redeemTelegramLinkCode(code: string): Promise<User> {
    const response = await api.post('/users/me/telegram-link-code/redeem', { code });
    return response.data;
  }
}

export const usersService = new UsersService();
