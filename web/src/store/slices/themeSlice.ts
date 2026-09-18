import { createSlice } from '@reduxjs/toolkit';

import { readStored } from '../../utils/safeStorage';

const STORAGE_KEY = 'gall_theme';

// Runs at module scope, and under SSR that scope is the server — the store is
// imported by lib/queryClient, which a Server Component imports in turn.
//
// The server always answers "light". It cannot know better: the stored choice
// is in the visitor's browser and the system preference is their OS. The real
// value is applied before first paint by the inline script in the root layout,
// which is why that script exists at all, and Redux picks it up when this
// module is evaluated again on the client.
function loadInitialIsDark(): boolean {
  if (typeof window === 'undefined') return false;

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
