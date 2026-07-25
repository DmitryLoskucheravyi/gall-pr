import { Outlet } from 'react-router-dom';

import Header from './Header';
import SupportWidget from '../support/SupportWidget';
import { useAppSelector } from '../../store/hooks';
import styles from './Layout.module.scss';

export default function Layout() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const userRole = useAppSelector((state) => state.auth.user?.role);

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
      {isAuthenticated && userRole !== 'ADMIN' && <SupportWidget />}
    </div>
  );
}
