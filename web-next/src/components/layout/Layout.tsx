'use client';

import { Suspense, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import ContinuePrompt from './ContinuePrompt';
import ScrollToTop from './ScrollToTop';
import SupportWidget from '../support/SupportWidget';
import ErrorBoundary from '../ErrorBoundary';
import { useAppSelector } from '../../store/hooks';
import { useScrollContinue } from '../../hooks/useScrollContinue';
import { stripLocale } from '../../utils/locale';
import styles from './Layout.module.scss';

// AuthPage is its own full-bleed arrival screen — video, one docked form,
// nothing else. The ordinary chrome below (footer, the support launcher)
// belongs to the rest of the site, not to that moment. Compared against the
// locale-stripped path, so this stays a plain, unprefixed lookup.
const CHROME_FREE_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]);

// The site chrome. A client component because everything in it is interactive
// — the scroll-continue bar, the support launcher, the admin menu — and because
// it reads the signed-in user from Redux, which only exists on the client.
//
// `children` replaces react-router's <Outlet />: in the App Router a layout is
// handed its page rather than rendering a slot the router fills.
export default function Layout({ children }: { children: ReactNode }) {
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const pathname = usePathname();
  const showChrome = !CHROME_FREE_PATHS.has(stripLocale(pathname));
  // Scrolling past the bottom of a handful of pages carries the reader on to
  // the next one — see the hook for which. Owned here, not by Footer, so the
  // handover veil below can sit above the whole page rather than just it.
  const { nextPath, progress, leaving } = useScrollContinue();

  return (
    <div className={styles.page}>
      <ScrollToTop />
      <Header compact={!showChrome} />
      <main className={styles.main}>
        {/* A second boundary, inside the chrome: a page that throws should
            leave the header, the footer and the nav standing so the visitor
            can go somewhere else. Keyed by pathname so navigating away clears
            the error rather than staying stuck on it. */}
        <ErrorBoundary key={pathname}>
          <Suspense fallback={null}>{children}</Suspense>
        </ErrorBoundary>
      </main>
      {showChrome && (
        <Footer continueTo={nextPath} continueProgress={progress} />
      )}
      {showChrome && <BottomNav />}
      {/* Footer's own continue row hides itself on a phone — this is what
          takes over there. See ContinuePrompt for why. */}
      {showChrome && <ContinuePrompt nextPath={nextPath} progress={progress} />}
      {/* Phones reach support from the header instead — the launcher would
          only fight the bottom bar for the same corner. Hidden there by CSS
          rather than unmounted so the desktop instance keeps its state.
          Shown to guests too; only the admin, who answers these, has no use
          for it. */}
      {showChrome && userRole !== 'ADMIN' && <SupportWidget />}
      {/* The handover between chained pages. Same ink as the footer it
          launches from, so the screen simply goes to that colour and the
          next page arrives out of it. */}
      <div className={styles.veil} data-active={leaving} aria-hidden="true" />
    </div>
  );
}
