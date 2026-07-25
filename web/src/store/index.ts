import { configureStore } from '@reduxjs/toolkit';

import authReducer, { AUTH_STORAGE_KEY } from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import settingsReducer from './slices/settingsSlice';
import toastReducer from './slices/toastSlice';
import themeReducer, { THEME_STORAGE_KEY } from './slices/themeSlice';
import likesReducer from './slices/likesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    settings: settingsReducer,
    toast: toastReducer,
    theme: themeReducer,
    likes: likesReducer,
  },
});

store.subscribe(() => {
  const { auth, theme } = store.getState();
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  localStorage.setItem(THEME_STORAGE_KEY, theme.isDark ? 'dark' : 'light');
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
