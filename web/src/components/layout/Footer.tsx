import { Link, NavLink } from 'react-router-dom';

import { useAppSelector } from '../../store/hooks';
import styles from './Footer.module.scss';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.link} ${isActive ? styles.active : ''}`;

export default function Footer() {
  const authorName = useAppSelector((state) => state.settings.authorName);
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link to="/" className={styles.logo}>
              <span className={styles.wordmark}>Viktorumm</span>
              <span className={styles.rule} />
            </Link>
            <p className={styles.tagline}>
              Кураторська добірка оригінальних картин{' '}
              {authorName ? `від ${authorName}` : 'від українських художників'}.
              Кожна робота — в єдиному екземплярі.
            </p>
          </div>

          <nav className={styles.column}>
            <h3 className={styles.columnTitle}>Навігація</h3>
            <NavLink to="/" end className={linkClass}>
              Головна
            </NavLink>
            <NavLink to="/catalog" className={linkClass}>
              Каталог
            </NavLink>
            <NavLink to="/gallery" className={linkClass}>
              Галерея
            </NavLink>
          </nav>

          <nav className={styles.column}>
            <h3 className={styles.columnTitle}>Кабінет</h3>
            <NavLink to="/favorites" className={linkClass}>
              Улюблені
            </NavLink>
            <NavLink to="/cart" className={linkClass}>
              Кошик
            </NavLink>
            <NavLink to="/orders" className={linkClass}>
              Замовлення
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              Профіль
            </NavLink>
          </nav>

          <nav className={styles.column}>
            <h3 className={styles.columnTitle}>Підтримка</h3>
            <NavLink to="/support" className={linkClass}>
              Чат з підтримкою
            </NavLink>
            <NavLink to="/login" className={linkClass}>
              Увійти
            </NavLink>
            <NavLink to="/register" className={linkClass}>
              Реєстрація
            </NavLink>
          </nav>
        </div>

        <div className={styles.bottom}>
          <span className={styles.copyright}>
            © {year} {authorName || 'Viktorumm'}. Усі права захищено.
          </span>
          <button
            type="button"
            onClick={scrollToTop}
            className={styles.topButton}
          >
            Нагору
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 19V5m0 0-6 6m6-6 6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
