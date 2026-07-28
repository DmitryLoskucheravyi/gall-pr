import axios from 'axios';

import { store } from '../store';
import { refreshAuth, logout } from '../store/slices/authSlice';
import { getGuestToken } from '../utils/guestToken';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const accessToken = store.getState().auth.accessToken;

  if (accessToken) {
    delete config.headers['X-Guest-Token'];
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else {
    delete config.headers.Authorization;
    config.headers['X-Guest-Token'] = getGuestToken();
  }

  return config;
});

// Concurrent 401s must share a single refresh call: the backend rotates
// the refresh token on every use, so two independent refresh requests
// racing on the same old token would leave one of them rejected as
// "invalid" and force a logout right after a perfectly good refresh.
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(refreshToken: string): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, { refreshToken })
      .then((response) => {
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        store.dispatch(refreshAuth({ accessToken, refreshToken: newRefreshToken }));
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    const isAuthRefreshCall = originalRequest?.url?.includes('/auth/refresh');

    // Routes behind OptionalJwtAuthGuard (cart, orders) never reject a bad
    // token with 401 — an expired/invalid JWT just leaves req.user unset,
    // and since we only ever send Authorization *or* X-Guest-Token, that
    // request then has no identity at all and gets a hard 400 "Guest token
    // required". Treat it the same as an expired token: refresh if we can,
    // otherwise log out and retry once more so the retry goes out as guest.
    const isStaleTokenGuestFallback =
      error.response?.status === 400 &&
      error.response?.data?.message === 'Guest token required' &&
      !!originalRequest?.headers?.Authorization;

    if (
      (error.response?.status === 401 || isStaleTokenGuestFallback) &&
      !originalRequest._retry &&
      !isAuthRefreshCall
    ) {
      originalRequest._retry = true;

      const refreshToken = store.getState().auth.refreshToken;

      if (!refreshToken) {
        store.dispatch(logout());

        if (isStaleTokenGuestFallback) {
          delete originalRequest.headers.Authorization;
          return api(originalRequest);
        }

        return Promise.reject(error);
      }

      try {
        const accessToken = await refreshAccessToken(refreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        store.dispatch(logout());

        if (isStaleTokenGuestFallback) {
          delete originalRequest.headers.Authorization;
          return api(originalRequest);
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
