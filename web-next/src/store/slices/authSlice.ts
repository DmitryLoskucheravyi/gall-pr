import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AuthResponse, User } from '../../types/auth.types';

type AuthState = {
  user: User | null;
  // In memory only, and deliberately so. This used to be written to
  // localStorage together with a 30-day refresh token, which meant any script
  // running on the page could read both and keep using the account for a month
  // from anywhere. The refresh token is now an httpOnly cookie the page cannot
  // see at all, and this one expires in 15 minutes.
  //
  // Nothing here survives a reload. The session is re-established on startup
  // from the cookie — see auth/bootstrap.ts.
  accessToken: string | null;
  isAuthenticated: boolean;
  // Until the startup refresh has answered we genuinely don't know whether
  // there's a session. Rendering as "logged out" during that window is what
  // makes a signed-in user see a flash of the wrong header on every reload,
  // and would bounce them off a protected route outright.
  isBootstrapped: boolean;
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapped: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<AuthResponse>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.isBootstrapped = true;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    // A rotation that didn't change who is signed in — only the access token
    // is replaced, and the cookie behind it was rotated server-side.
    refreshAuth: (state, action: PayloadAction<{ accessToken: string }>) => {
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.isBootstrapped = true;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      // Still bootstrapped: we know the answer now, it's just "nobody".
      state.isBootstrapped = true;
    },
    // The startup refresh came back with no session. Distinct from logout()
    // only in intent; both end in the same known-anonymous state.
    bootstrapped: (state) => {
      state.isBootstrapped = true;
    },
  },
});

export const { setAuth, setUser, refreshAuth, logout, bootstrapped } =
  authSlice.actions;
export default authSlice.reducer;
