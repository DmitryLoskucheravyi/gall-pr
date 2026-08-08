import { configureStore } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice';
import toastReducer from './slices/toastSlice';
import themeReducer, { THEME_STORAGE_KEY } from './slices/themeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    toast: toastReducer,
    theme: themeReducer,
  },
});

// Theme only. Auth used to be written here as well, which put a 30-day refresh
// token in localStorage for any script on the page to read; the session now
// lives in an httpOnly cookie and is re-established on startup instead.
store.subscribe(() => {
  const { theme } = store.getState();
  localStorage.setItem(THEME_STORAGE_KEY, theme.isDark ? 'dark' : 'light');
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
