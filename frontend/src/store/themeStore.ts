import { Appearance } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeState = { isDark: boolean; toggleTheme: () => void };

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: Appearance.getColorScheme() === 'dark',

      toggleTheme: () => {
        set(({ isDark }) => ({ isDark: !isDark }));
      },
    }),
    { name: 'theme-storage', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
