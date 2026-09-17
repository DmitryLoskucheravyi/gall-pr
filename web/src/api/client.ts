import axios from 'axios';

import { store } from '../store';
import { refreshAuth, logout } from '../store/slices/authSlice';
import { getGuestToken } from '../utils/guestToken';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// withCredentials is what lets the browser attach the refresh cookie. It only
// actually travels on /auth/* — the cookie is scoped to that path — so every
// other call still authenticates with the bearer header below and carries no
// ambient credential, which is what keeps CSRF off the table for the rest of
// the API.
export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
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

// Concurrent 401s must share a single refresh call: the backend rotates the
// refresh token on every use, so two independent refreshes would race on the
// same cookie and one would be rejected as invalid right after a perfectly
// good rotation.
let refreshPromise: Promise<string> | null = null;

// No argument any more — the refresh token is a cookie the browser attaches
// itself, and this code cannot read it. Exported because startup uses the same
// single-flight path: see auth/bootstrap.ts.
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, null, { withCredentials: true })
      .then((response) => {
        const { accessToken } = response.data;
        store.dispatch(refreshAuth({ accessToken }));
        return accessToken as string;
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
    // The string is a sentinel the server keeps in English for exactly this
    // comparison — see resolveIdentity in backend/src/common/identity.util.ts.
    // Change it there and this branch stops firing, silently.
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

      // There is no longer a refresh token to check for up front — whether a
      // session exists is something only the server can answer, by looking at
      // the cookie. So we always ask, and treat a failure as "no session".
      try {
        const accessToken = await refreshAccessToken();

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
