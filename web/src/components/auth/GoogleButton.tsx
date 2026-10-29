'use client';

import { useEffect, useRef, useState } from 'react';

import { useLocale } from '../../hooks/useLocale';
import styles from './AuthPanel.module.scss';

// Google Identity Services, the minimum of its surface this file touches.
// https://developers.google.com/identity/gsi/web/reference/js-reference
type CredentialResponse = { credential: string };

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
    context?: 'signin' | 'signup' | 'use';
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
      locale?: string;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

// One script per page however many buttons mount; a failed load is forgotten
// so the next mount can try again.
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();

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
  // Which wording Google puts on the button: "Sign in with" or "Sign up with".
  // The flow behind both is the same — see AuthService.googleSignIn.
  mode: 'signin' | 'signup';
  onCredential: (credential: string) => void;
  disabled?: boolean;
};

// Google's own button, not a lookalike: their branding rules require it, and
// it is the button that carries the account chooser and FedCM. It renders
// into an iframe, so it is sized from its container rather than styled.
export default function GoogleButton({ mode, onCredential, disabled }: Props) {
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  // initialize() is global to the page, so the callback it holds is whatever
  // the last mount passed. A ref keeps it pointed at this render's handler
  // without re-rendering Google's iframe on every keystroke in the form.
  const callbackRef = useRef(onCredential);
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelled = false;

    loadScript()
      .then(() => {
        const container = containerRef.current;
        const id = window.google?.accounts.id;
        if (cancelled || !container || !id) return;

        id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => callbackRef.current(response.credential),
          ux_mode: 'popup',
          context: mode === 'signup' ? 'signup' : 'signin',
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        container.replaceChildren();
        id.renderButton(container, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: mode === 'signup' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          // Google caps the width at 400px; the panel is 380px at most.
          width: Math.min(Math.round(container.offsetWidth) || 320, 400),
          locale: locale === 'ua' ? 'uk' : 'en',
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, locale]);

  if (!CLIENT_ID || failed) return null;

  return (
    <div
      ref={containerRef}
      className={styles.google}
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
    />
  );
}
