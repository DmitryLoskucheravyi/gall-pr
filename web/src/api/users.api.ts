import { api } from './client';
import type { AdminUser } from '../types/user.types';

class UsersService {
  async getUsers(): Promise<AdminUser[]> {
    const response = await api.get('/users');
    return response.data;
  }

  async deleteUser(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  }
}

export const usersService = new UsersService();
