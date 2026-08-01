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

  async verifyEmail(email: string, code: string): Promise<{ user: User }> {
    const response = await api.post('/auth/verify-email', { email, code });
    return response.data;
  }

  async resendCode(email: string): Promise<void> {
    await api.post('/auth/resend-code', { email });
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
