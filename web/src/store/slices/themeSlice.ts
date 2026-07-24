import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'gall_theme';

function loadInitialIsDark(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

const themeSlice = createSlice({
  name: 'theme',
  initialState: { isDark: loadInitialIsDark() },
  reducers: {
    toggleTheme: (state) => {
      state.isDark = !state.isDark;
    },
  },
});

export const { toggleTheme } = themeSlice.actions;
export { STORAGE_KEY as THEME_STORAGE_KEY };
export default themeSlice.reducer;
