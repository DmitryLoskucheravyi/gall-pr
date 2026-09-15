import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import ScrollToTop from './ScrollToTop';
import SupportWidget from '../support/SupportWidget';
import { useAppSelector } from '../../store/hooks';
import { useScrollContinue } from '../../hooks/useScrollContinue';
import styles from './Layout.module.scss';

// AuthPage is its own full-bleed arrival screen — video, one docked form,
// nothing else. The ordinary chrome below (footer, the support launcher)
// belongs to the rest of the site, not to that moment.
const CHROME_FREE_PATHS = new Set(['/login', '/register']);

export default function Layout() {
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const { pathname } = useLocation();
  const showChrome = !CHROME_FREE_PATHS.has(pathname);
  // Scrolling past the bottom of a handful of pages carries the reader on to
  // the next one — see the hook for which. Owned here, not by Footer, so the
  // handover veil below can sit above the whole page rather than just it.
  const { nextPath, progress, leaving } = useScrollContinue();

  return (
    <div className={styles.page}>
      <ScrollToTop />
      <Header compact={!showChrome} />
      <main className={styles.main}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      {showChrome && <Footer continueTo={nextPath} continueProgress={progress} />}
      {showChrome && <BottomNav />}
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
