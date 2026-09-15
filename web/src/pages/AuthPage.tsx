import { useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import { useBoomerangVideo } from '../hooks/useBoomerangVideo';
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

  const videoRef = useRef<HTMLVideoElement>(null);
  // The clip's first and last frames don't quite match, so a hard loop cut
  // showed a seam every cycle — this plays it forward then back rather than
  // jumping to the start. See the hook for why that isn't just `loop`.
  useBoomerangVideo(videoRef);

  return (
    <div className={styles.page}>
      {!reduced && (
        <video
          ref={videoRef}
          className={styles.bg}
          autoPlay
          muted
          playsInline
          aria-hidden="true"
        >
          <source src="/logreg.mp4" type="video/mp4" />
        </video>
      )}
      <div className={styles.tint} aria-hidden="true" />

      <div className={styles.dock} data-side={side}>
        {active === 'login' ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  );
}
