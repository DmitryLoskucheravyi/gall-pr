import { api } from './client';
import type {
  AuthResponse,
  AuthSession,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  User,
} from '../types/auth.types';

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

  // The answer is deliberately the same whether or not the address belongs to
  // anyone — see the note on the server route. Nothing here should treat a
  // success as confirmation that an account exists.
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const response = await api.post('/auth/forgot-password', dto);
    return response.data;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const response = await api.post('/auth/reset-password', dto);
    return response.data;
  }

  async changePassword(dto: ChangePasswordDto): Promise<{ message: string }> {
    const response = await api.post('/auth/change-password', dto);
    return response.data;
  }

  async getSessions(): Promise<AuthSession[]> {
    const response = await api.get('/auth/sessions');
    return response.data;
  }

  async endSession(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/auth/sessions/${id}`);
    return response.data;
  }

  async logoutEverywhere(): Promise<{ ended: number }> {
    const response = await api.post('/auth/logout-all');
    return response.data;
  }
}

export const authService = new AuthService();
