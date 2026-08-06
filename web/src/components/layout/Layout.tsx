import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import ScrollToTop from './ScrollToTop';
import SupportWidget from '../support/SupportWidget';
import { useAppSelector } from '../../store/hooks';
import styles from './Layout.module.scss';

export default function Layout() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const userRole = useAppSelector((state) => state.auth.user?.role);

  return (
    <div className={styles.page}>
      <ScrollToTop />
      <Header />
      <main className={styles.main}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
      {/* Phones reach support from the header instead — the launcher would
          only fight the bottom bar for the same corner. Hidden there by CSS
          rather than unmounted so the desktop instance keeps its state. */}
      {isAuthenticated && userRole !== 'ADMIN' && <SupportWidget />}
    </div>
  );
}
