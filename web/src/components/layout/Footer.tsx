import { Link, NavLink } from 'react-router-dom';

import { useAuthorName } from '../../hooks/queries/useSettings';
import styles from './Footer.module.scss';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.link} ${isActive ? styles.active : ''}`;

export default function Footer() {
  const authorName = useAuthorName();
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
            aria-label="Нагору"
            className={styles.topButton}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M6 15.5 12 9l6 6.5"
                stroke="currentColor"
                strokeWidth="2"
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
