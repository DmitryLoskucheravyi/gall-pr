import { getMe, refresh } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';

export const bootstrapAuth = async () => {
  const store = useAuthStore.getState();

  try {
    if (!store.accessToken) return;
    const profile = await getMe();
    store.setUser(profile);
  } catch {
    try {
      if (!store.refreshToken) {
        store.logout();
        return;
      }
      const tokens = await refresh(store.refreshToken);
      store.refreshAuth(tokens.accessToken, tokens.refreshToken);
      const profile = await getMe();
      store.setUser(profile);
    } catch {
      store.logout();
    }
  }
};
