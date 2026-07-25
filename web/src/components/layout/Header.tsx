import { flushSync } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { toggleTheme } from '../../store/slices/themeSlice';
import styles from './Header.module.scss';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.navLink} ${isActive ? styles.active : ''}`;

export default function Header() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const cartCount = useAppSelector((state) => state.cart.count);
  const isDark = useAppSelector((state) => state.theme.isDark);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const handleThemeToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (!document.startViewTransition || prefersReducedMotion) {
      dispatch(toggleTheme());
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const root = document.documentElement;
    root.style.setProperty('--theme-toggle-x', `${x}px`);
    root.style.setProperty('--theme-toggle-y', `${y}px`);
    root.style.setProperty('--theme-toggle-r', `${radius}px`);

    document.startViewTransition(() => {
      flushSync(() => {
        dispatch(toggleTheme());
      });
    });
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.wordmark}>Viktorumm</span>
          <span className={styles.rule} />
        </Link>

        <nav className={styles.nav}>
          <NavLink to="/" className={navLinkClass} end>
            Головна
          </NavLink>
          <NavLink to="/catalog" className={navLinkClass}>
            Каталог
          </NavLink>
          <NavLink to="/gallery" className={navLinkClass}>
            Галерея
          </NavLink>
          <NavLink to="/cart" className={navLinkClass}>
            Кошик{cartCount > 0 && ` (${cartCount})`}
          </NavLink>

          {user && (
            <NavLink to="/favorites" className={navLinkClass}>
              Улюблені
            </NavLink>
          )}

          {user?.role === 'ADMIN' && (
            <>
              <NavLink to="/admin/dictionaries" className={navLinkClass}>
                Матеріали і техніки
              </NavLink>
              <NavLink to="/admin/orders" className={navLinkClass}>
                Замовлення
              </NavLink>
              <NavLink to="/admin/settings" className={navLinkClass}>
                Налаштування
              </NavLink>
            </>
          )}

          <button
            onClick={handleThemeToggle}
            aria-label="Перемкнути тему"
            className={styles.themeButton}
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36-.7-.7M6.34 6.34l-.7-.7m12.72 0-.7.7M6.34 17.66l-.7.7M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          {user ? (
            <div className={styles.userGroup}>
              <NavLink to="/profile" className={navLinkClass}>
                {user.firstName}
              </NavLink>
              <button onClick={handleLogout} className={styles.logoutButton}>
                Вийти
              </button>
            </div>
          ) : (
            <NavLink to="/login" className={navLinkClass}>
              Увійти
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
