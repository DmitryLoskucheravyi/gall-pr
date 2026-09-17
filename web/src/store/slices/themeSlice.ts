import { createSlice } from '@reduxjs/toolkit';

import { readStored } from '../../utils/safeStorage';

const STORAGE_KEY = 'gall_theme';

function loadInitialIsDark(): boolean {
  const stored = readStored(STORAGE_KEY);
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
