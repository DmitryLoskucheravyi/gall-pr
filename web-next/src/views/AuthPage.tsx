'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';

import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm';
import ResetPasswordForm from '../components/auth/ResetPasswordForm';
import { useAlternatingVideo } from '../hooks/useAlternatingVideo';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { stripLocale } from '../utils/locale';
import styles from './AuthPage.module.scss';

// One page for four routes, but only ever one form: /login docks to the right
// edge, /register to the left, both over the same full-bleed video. Switching
// — the link at the foot of any form — is a normal route change: React swaps
// which form mounts, it never shows two at once.
//
// Password recovery lives here rather than on a page of its own so that losing
// a password doesn't drop the visitor out of the scene and into bare chrome.
// It sides with login, which is where it came from and where it goes back to.
const FORMS = {
  '/register': RegisterForm,
  '/forgot-password': ForgotPasswordForm,
  '/reset-password': ResetPasswordForm,
  '/login': LoginForm,
} as const;

type AuthRoute = keyof typeof FORMS;

export default function AuthPage() {
  const pathname = usePathname();
  const path = stripLocale(pathname);
  const active: AuthRoute = path in FORMS ? (path as AuthRoute) : '/login';
  const ActiveForm = FORMS[active];
  const side = active === '/register' ? 'left' : 'right';

  // False on the first render, including the server's, then corrected — see
  // useReducedMotion for why reading matchMedia during render cannot work
  // under SSR.
  const reduced = useReducedMotion();

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
          {/* The poster is the background until — and if — the footage
              arrives. It is the clip's own first frame, so there is nothing
              to see happen when playback takes over, and it is what stays
              on a browser that refuses to autoplay, a connection that never
              delivers, or a decoder that won't take the file. The page used
              to show flat black in all three cases. */}
          <video
            ref={startRef}
            className={styles.bg}
            src="/logregstart.mp4"
            poster="/logreg.jpg"
            autoPlay
            muted
            playsInline
            preload="auto"
            // Competes with the JS bundle, the CSS, the fonts for the same
            // connection otherwise — this is the one thing on the page
            // meant to be moving the moment it can be, so it goes first.
            // Not yet in React's DOM types for a <video>, hence the cast.
            {...({ fetchpriority: 'high' } as Record<string, string>)}
            aria-hidden="true"
          />
          {/* Held back until the first clip can play, then loaded across the
              four seconds it has in hand — see warmPartner in the hook. Both
              at once was five megabytes competing for the same connection on
              the first screen a visitor sees. */}
          <video
            ref={endRef}
            className={styles.bg}
            src="/logregend.mp4"
            poster="/logreg.jpg"
            muted
            playsInline
            preload="none"
            aria-hidden="true"
            style={{ opacity: 0 }}
          />
        </>
      )}
      <div className={styles.tint} aria-hidden="true" />

      <div className={styles.dock} data-side={side}>
        <ActiveForm />
      </div>
    </div>
  );
}
