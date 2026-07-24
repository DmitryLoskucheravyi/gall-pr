import { Link } from 'react-router-dom';

import { useAppSelector } from '../store/hooks';
import styles from './ProfilePage.module.scss';

export default function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user);

  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.avatar}>{initials || '?'}</div>
        <h1 className={styles.name}>
          {user.firstName} {user.lastName}
        </h1>
        {user.role === 'ADMIN' && (
          <span className={styles.adminBadge}>Адміністратор</span>
        )}
      </div>

      <div className={styles.info}>
        <div>
          <p className={styles.infoLabel}>Email</p>
          <p className={styles.infoValue}>{user.email}</p>
        </div>
        <div>
          <p className={styles.infoLabel}>Телефон</p>
          <p className={styles.infoValue}>{user.phone || '—'}</p>
        </div>
      </div>

      <Link to="/orders" className={styles.ordersLink}>
        Мої замовлення
      </Link>
    </div>
  );
}
