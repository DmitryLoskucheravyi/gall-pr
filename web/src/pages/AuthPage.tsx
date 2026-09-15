import { useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import { useAlternatingVideo } from '../hooks/useAlternatingVideo';
import styles from './AuthPage.module.scss';

// One page for both routes, but only ever one form: /login shows the login
// form docked to the right edge, /register shows the register form docked
// to the left, both over the same full-bleed video. Switching — the link at
// the foot of either form — is a normal route change: React swaps which
// form mounts, it never shows both at once.
export default function AuthPage() {
  const { pathname } = useLocation();
  const active = pathname === '/register' ? 'register' : 'login';
  const side = active === 'register' ? 'left' : 'right';

  // Matched once, not watched — a visitor who changes the OS setting mid
  // visit gets the new value on their next navigation, same as every other
  // scroll-driven section on the site.
  const reduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // Two elements, one clip each, permanently mounted and crossfaded — see
  // the hook for why (in short: swapping one element's `src` flashed black
  // while the new clip loaded).
  const startRef = useRef<HTMLVideoElement>(null);
  const endRef = useRef<HTMLVideoElement>(null);
  useAlternatingVideo(startRef, endRef);

  return (
    <div className={styles.page}>
      {!reduced && (
        <>
          <video
            ref={startRef}
            className={styles.bg}
            src="/logregstart.mp4"
            autoPlay
            muted
            playsInline
            aria-hidden="true"
          />
          <video
            ref={endRef}
            className={styles.bg}
            src="/logregend.mp4"
            muted
            playsInline
            aria-hidden="true"
            style={{ opacity: 0 }}
          />
        </>
      )}
      <div className={styles.tint} aria-hidden="true" />

      <div className={styles.dock} data-side={side}>
        {active === 'login' ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  );
}
