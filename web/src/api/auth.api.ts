import { api } from './client';
import type { AuthResponse, LoginDto, RegisterDto, User } from '../types/auth.types';

class AuthService {
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const response = await api.post('/auth/register', dto);
    return response.data;
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const response = await api.post('/auth/login', dto);
    return response.data;
  }

  async getProfile(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data;
  }

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  }
}

export const authService = new AuthService();
