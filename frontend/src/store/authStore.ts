import { AuthResponse, User } from '../types/auth.types';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthStore = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setAuth: (data: AuthResponse) => void;

  logout: () => void;
  setUser: (user: User) => void;
  refreshAuth: (accessToken: string, refreshToken: string) => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (data) => {
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
      },

      setUser: (user) => {
        set({ user });
      },
      refreshAuth: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),

    { name: 'auth-storage', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
