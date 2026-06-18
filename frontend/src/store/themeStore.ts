import { create } from "zustand";


type ThemeState = {
    isDark: boolean;
    toggleTheme: () => void;
}


export const useThemeStore = create<ThemeState>((set) => ({
    isDark: false,

    toggleTheme: () => {
        set(({ isDark }) => ({
            isDark: !isDark
        }))
    },
}))