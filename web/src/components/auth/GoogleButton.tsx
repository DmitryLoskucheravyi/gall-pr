'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './AuthPanel.module.scss';

// Google Identity Services' token client — the part of it that lets a page
// use its own button. Google's rendered button draws itself in an iframe and
// can't be restyled; this one opens the same account chooser in a popup and
// hands back an access token, which the API checks was issued to our client
// id before reading the profile (see GoogleIdTokenVerifier.verifyAccessToken).
// https://developers.google.com/identity/oauth2/web/reference/js-reference
type TokenResponse = { access_token?: string; error?: string };

type TokenClient = { requestAccessToken: (options?: { prompt?: string }) => void };

type GoogleOAuth2 = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type?: string }) => void;
  }) => TokenClient;
};

declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth2 } };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

// One script per page however many buttons mount; a failed load is forgotten
// so the next mount can try again.
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error('Google Identity Services failed to load'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export const isGoogleAuthEnabled = CLIENT_ID !== '';

type Props = {
  mode: 'signin' | 'signup';
  onAccessToken: (accessToken: string) => void;
  disabled?: boolean;
};

// The site's own button: an outline the height and shape of the form's
// submit, in its type, with a monoline "G" drawn in the same hairline as the
// rest of the site's icons rather than Google's four-colour mark.
export default function GoogleButton({ mode, onAccessToken, disabled }: Props) {
  const { t } = useTranslation('auth');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const clientRef = useRef<TokenClient | null>(null);

  // The token client holds its callback for good; a ref keeps it pointed at
  // this render's handler.
  const callbackRef = useRef(onAccessToken);
  useEffect(() => {
    callbackRef.current = onAccessToken;
  }, [onAccessToken]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    // Loaded up front, not on click: popup blockers allow a window only
    // inside the click itself, so the client must already exist by then.
    loadScript()
      .then(() => {
        const oauth2 = window.google?.accounts.oauth2;
        if (cancelled || !oauth2) return;

        clientRef.current = oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: 'openid email profile',
          callback: (response) => {
            if (response.access_token) callbackRef.current(response.access_token);
          },
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID || failed) return null;

  return (
    <button
      type="button"
      className={styles.googleButton}
      disabled={!ready || disabled}
      onClick={() => clientRef.current?.requestAccessToken({ prompt: 'select_account' })}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.googleGlyph}>
        <path
          d="M20 12a8 8 0 1 1-2.34-5.66"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M20.5 12H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span>{mode === 'signup' ? t('google.signup') : t('google.signin')}</span>
    </button>
  );
}
