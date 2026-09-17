import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { API_URL, refreshAccessToken } from '../api/client';
import { store } from '../store';
import { useAppSelector } from '../store/hooks';
import { getGuestToken } from '../utils/guestToken';

// One or the other, never both — see the gateway's identify(): a JWT names an
// account, a guest token names an anonymous thread.
type SupportHandshake = { token?: string; guestToken?: string };

// Connects as whoever the visitor is: with a JWT when signed in, otherwise
// with the browser's guest token — the same one the cart travels on, so an
// anonymous conversation survives a closed tab.
export function useSupportSocket(enabled: boolean) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [socket, setSocket] = useState<Socket | null>(null);

  // The token is read at connect time, not captured in the effect's closure.
  //
  // Access tokens last fifteen minutes, and the handshake credentials used to
  // be frozen into the `io()` call — so after a network blip, socket.io
  // reconnected with whatever token it was created with. Once that expired the
  // gateway rejected every attempt and the client retried forever with the
  // same dead token: a chat that silently stopped working and never recovered.
  const authRef = useRef<() => SupportHandshake>(() => ({}));
  authRef.current = () => {
    const accessToken = store.getState().auth.accessToken;

    return accessToken ? { token: accessToken } : { guestToken: getGuestToken() };
  };

  useEffect(() => {
    if (!enabled) {
      setSocket(null);
      return;
    }

    const instance = io(`${API_URL}/support`, {
      // The callback form: socket.io calls this before *every* connection
      // attempt, so each reconnect carries a token that is current then.
      auth: (callback: (data: SupportHandshake) => void) => {
        callback(authRef.current());
      },
      transports: ['websocket'],
    });

    // A signed-in visitor whose access token has expired is refused by the
    // gateway. Minting a fresh one and letting socket.io try again is the
    // whole repair — and it can only be done once per disconnect, or a
    // genuinely revoked session would spin.
    let refreshing = false;

    const onConnectError = () => {
      if (refreshing || !store.getState().auth.isAuthenticated) return;

      refreshing = true;
      refreshAccessToken()
        .catch(() => {
          // No session left. Reconnecting as a guest is wrong here — that
          // would be somebody else's thread — so let it keep failing quietly
          // until the app notices it is signed out.
        })
        .finally(() => {
          refreshing = false;
        });
    };

    instance.on('connect_error', onConnectError);

    setSocket(instance);

    return () => {
      instance.off('connect_error', onConnectError);
      instance.disconnect();
      setSocket(null);
    };
    // Deliberately not keyed on the access token: rotating it every fifteen
    // minutes would tear down and rebuild the socket, and with it the open
    // conversation. Signing in or out is a real change of identity and does
    // warrant a new connection.
  }, [enabled, isAuthenticated]);

  return socket;
}
