import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import Header from './Header';
import Footer from './Footer';
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
      {isAuthenticated && userRole !== 'ADMIN' && <SupportWidget />}
    </div>
  );
}
