import axios from 'axios';

import { API_URL } from '../api/client';
import { store } from '../store';
import { setAuth, bootstrapped } from '../store/slices/authSlice';
import { removeStored } from '../utils/safeStorage';

// Re-establishes the session on page load.
//
// Nothing about being signed in is stored client-side any more, so on startup
// the app genuinely does not know who it is. The refresh cookie does, and only
// the server can read it — so this asks once, and whatever comes back is the
// answer.
//
// It goes through axios directly rather than the shared client: the request
// interceptor there would attach a guest token, and this is the one call that
// must be about the cookie and nothing else.
//
// A rejection is the ordinary case, not an error — it is what "no session"
// looks like. Every visitor who has never logged in takes that path, so it
// must be quiet.
// Every browser that used the app before this change still has a 'gall_auth'
// entry holding the old access and refresh tokens. Rotating the signing keys
// already made them useless, but a localStorage key full of credentials is the
// exact thing this change exists to get rid of — so clear it on the way past.
// Safe to keep indefinitely; it's a no-op once nobody has one.
function dropLegacyPersistedSession(): void {
  removeStored('gall_auth');
}

export async function bootstrapAuth(): Promise<void> {
  dropLegacyPersistedSession();

  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, null, {
      withCredentials: true,
    });

    const { accessToken, user } = response.data;
    store.dispatch(setAuth({ accessToken, user }));
  } catch {
    store.dispatch(bootstrapped());
  }
}
