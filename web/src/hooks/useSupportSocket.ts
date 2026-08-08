import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { API_URL } from '../api/client';
import { useAppSelector } from '../store/hooks';
import { getGuestToken } from '../utils/guestToken';

// Connects as whoever the visitor is: with a JWT when signed in, otherwise
// with the browser's guest token — the same one the cart travels on, so an
// anonymous conversation survives a closed tab.
export function useSupportSocket(enabled: boolean) {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSocket(null);
      return;
    }

    const instance = io(`${API_URL}/support`, {
      auth: accessToken ? { token: accessToken } : { guestToken: getGuestToken() },
      transports: ['websocket'],
    });

    setSocket(instance);

    return () => {
      instance.disconnect();
      setSocket(null);
    };
  }, [enabled, accessToken]);

  return socket;
}
