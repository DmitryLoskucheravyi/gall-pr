import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { toggleTheme } from '../../store/slices/themeSlice';
import styles from './Header.module.scss';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.navLink} ${isActive ? styles.active : ''}`;

const adminNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.adminMenuLink} ${isActive ? styles.active : ''}`;

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const cartCount = useAppSelector((state) => state.cart.count);
  const isDark = useAppSelector((state) => state.theme.isDark);

  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsAdminMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAdminMenuOpen) return;

    const handleOutside = (event: MouseEvent) => {
      if (!adminMenuRef.current?.contains(event.target as Node)) {
        setIsAdminMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAdminMenuOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isAdminMenuOpen]);

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

          {user?.role === 'ADMIN' && (
            <div ref={adminMenuRef} className={styles.adminMenu}>
              <button
                type="button"
                onClick={() => setIsAdminMenuOpen((prev) => !prev)}
                className={`${styles.navLink} ${styles.adminMenuTrigger} ${
                  isAdminMenuOpen ? styles.active : ''
                }`}
              >
                Адмін
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`${styles.adminMenuChevron} ${
                    isAdminMenuOpen ? styles.open : ''
                  }`}
                >
                  <path
                    d="m6 9 6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isAdminMenuOpen && (
                <div className={styles.adminMenuPanel}>
                  <NavLink to="/admin/dictionaries" className={adminNavLinkClass}>
                    Матеріали і техніки
                  </NavLink>
                  <NavLink to="/admin/orders" className={adminNavLinkClass}>
                    Замовлення
                  </NavLink>
                  <NavLink to="/admin/settings" className={adminNavLinkClass}>
                    Налаштування
                  </NavLink>
                  <NavLink to="/admin/support" className={adminNavLinkClass}>
                    Підтримка
                  </NavLink>
                  <NavLink to="/admin/giveaways" className={adminNavLinkClass}>
                    Розіграш
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {user && (
            <NavLink to="/favorites" className={navLinkClass}>
              Улюблені
            </NavLink>
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

          <NavLink
            to="/cart"
            aria-label="Кошик"
            className={({ isActive }) =>
              `${styles.cartButton} ${isActive ? styles.active : ''}`
            }
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M3 4h2l.4 2M7 13h10l3-8H6.4M7 13 5.4 6M7 13l-1.6 3.2A1 1 0 0 0 6.3 18H17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="21" r="1.4" fill="currentColor" />
              <circle cx="17" cy="21" r="1.4" fill="currentColor" />
            </svg>
            {cartCount > 0 && (
              <span className={styles.cartBadge}>{cartCount}</span>
            )}
          </NavLink>

          {user ? (
            <div className={styles.userGroup}>
              <NavLink
                to="/profile"
                aria-label="Профіль"
                className={({ isActive }) =>
                  `${styles.profileButton} ${isActive ? styles.active : ''}`
                }
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="8"
                    r="3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M4.5 19.5c1.4-3.1 4.3-5 7.5-5s6.1 1.9 7.5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </NavLink>
              <button
                onClick={handleLogout}
                aria-label="Вийти"
                className={styles.logoutButton}
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 17v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12h12m0 0-3.5-3.5M21 12l-3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
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
