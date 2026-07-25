import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { API_URL } from '../api/client';
import { useAppSelector } from '../store/hooks';

export function useSupportSocket(enabled: boolean) {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !accessToken) {
      setSocket(null);
      return;
    }

    const instance = io(`${API_URL}/support`, {
      auth: { token: accessToken },
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
