import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { toggleTheme } from '../../store/slices/themeSlice';
import { useCartCount } from '../../hooks/queries/useCart';
import { useAdminPendingOrdersCount } from '../../hooks/queries/useOrders';
import { useAdminUnreadSupportCount } from '../../hooks/queries/useSupport';
import styles from './Header.module.scss';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.navLink} ${isActive ? styles.active : ''}`;

const adminNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.adminMenuLink} ${isActive ? styles.active : ''}`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.mobileNavLink} ${isActive ? styles.active : ''}`;

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const cartCount = useCartCount();
  const pendingOrdersCount = useAdminPendingOrdersCount();
  const unreadSupportCount = useAdminUnreadSupportCount();
  const isDark = useAppSelector((state) => state.theme.isDark);

  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsAdminMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Exposes the header's real rendered height as a CSS var — the mobile hero
  // sticks just below it (see HomePage.module.scss), and hardcoding a pixel
  // guess would drift the moment the header's content/padding changes.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const setHeightVar = () => {
      document.documentElement.style.setProperty(
        '--header-height',
        `${el.offsetHeight}px`,
      );
    };

    setHeightVar();
    const observer = new ResizeObserver(setHeightVar);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

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

  const themeIcon = isDark ? (
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
  );

  const profileIcon = (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 19.5c1.4-3.1 4.3-5 7.5-5s6.1 1.9 7.5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );

  const favoritesIcon = (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 20.25c-.19 0-.38-.05-.55-.16-.66-.42-1.62-1.04-2.67-1.83C5.02 15.6 2.25 12.7 2.25 9.15 2.25 6.3 4.53 4 7.35 4c1.85 0 3.47.98 4.65 2.53C13.18 4.98 14.8 4 16.65 4c2.82 0 5.1 2.3 5.1 5.15 0 3.55-2.77 6.45-6.53 9.11-1.05.79-2.01 1.41-2.67 1.83-.17.11-.36.16-.55.16Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const supportIcon = (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );

  const cartIcon = (
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
  );

  return (
    <header ref={headerRef} className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.wordmark}>Viktorumm</span>
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
                  <NavLink to="/admin/users" className={adminNavLinkClass}>
                    Користувачі
                  </NavLink>
                  <NavLink to="/admin/orders" className={adminNavLinkClass}>
                    Замовлення
                    {pendingOrdersCount > 0 && (
                      <span className={styles.navBadge}>{pendingOrdersCount}</span>
                    )}
                  </NavLink>
                  <NavLink to="/admin/settings" className={adminNavLinkClass}>
                    Налаштування
                  </NavLink>
                  <NavLink to="/admin/support" className={adminNavLinkClass}>
                    Підтримка
                    {unreadSupportCount > 0 && (
                      <span className={styles.navBadge}>{unreadSupportCount}</span>
                    )}
                  </NavLink>
                  <NavLink to="/admin/giveaways" className={adminNavLinkClass}>
                    Розіграш
                  </NavLink>
                  <NavLink to="/admin/mail" className={adminNavLinkClass}>
                    Журнал листів
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
            {themeIcon}
          </button>

          <NavLink
            to="/cart"
            aria-label="Кошик"
            className={({ isActive }) =>
              `${styles.cartButton} ${isActive ? styles.active : ''}`
            }
          >
            {cartIcon}
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
                {profileIcon}
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

        <div className={styles.mobileActions}>
          {/* Home, catalog, cart, orders and gallery live in the bottom bar
              at this width — what's left up here is the occasional stuff. */}
          <button
            onClick={handleThemeToggle}
            aria-label="Перемкнути тему"
            className={styles.themeButton}
          >
            {themeIcon}
          </button>

          {/* The one slot that differs by role: an admin's most-used screen
              here is the support inbox, a customer's is their saved works. */}
          {user?.role === 'ADMIN' && (
            <NavLink
              to="/admin/support"
              aria-label={
                unreadSupportCount > 0
                  ? `Підтримка, ${unreadSupportCount} нових звернень`
                  : 'Підтримка'
              }
              className={({ isActive }) =>
                `${styles.iconButton} ${isActive ? styles.active : ''}`
              }
            >
              {supportIcon}
              {unreadSupportCount > 0 && (
                <span className={styles.cartBadge} aria-hidden="true">
                  {unreadSupportCount > 9 ? '9+' : unreadSupportCount}
                </span>
              )}
            </NavLink>
          )}

          {user && user.role !== 'ADMIN' && (
            <NavLink
              to="/favorites"
              aria-label="Улюблені"
              className={({ isActive }) =>
                `${styles.iconButton} ${isActive ? styles.active : ''}`
              }
            >
              {favoritesIcon}
            </NavLink>
          )}

          {user && (
            <NavLink
              to="/profile"
              aria-label="Профіль"
              className={({ isActive }) =>
                `${styles.profileButton} ${isActive ? styles.active : ''}`
              }
            >
              {profileIcon}
            </NavLink>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? 'Закрити меню' : 'Відкрити меню'}
            aria-expanded={isMobileMenuOpen}
            className={`${styles.burgerButton} ${
              isMobileMenuOpen ? styles.burgerOpen : ''
            }`}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <>
          <div
            className={styles.mobileBackdrop}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <nav className={styles.mobilePanel}>
            <NavLink to="/" className={mobileNavLinkClass} end>
              Головна
            </NavLink>
            <NavLink to="/catalog" className={mobileNavLinkClass}>
              Каталог
            </NavLink>
            <NavLink to="/gallery" className={mobileNavLinkClass}>
              Галерея
            </NavLink>
            <NavLink to="/cart" className={mobileNavLinkClass}>
              Кошик
              {cartCount > 0 && (
                <span className={styles.navBadge}>{cartCount}</span>
              )}
            </NavLink>
            <NavLink to="/orders" className={mobileNavLinkClass}>
              Замовлення
            </NavLink>

            {user && (
              <NavLink to="/favorites" className={mobileNavLinkClass}>
                Улюблені
              </NavLink>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <div className={styles.mobileDivider} />
                <span className={styles.mobileGroupLabel}>Адмін</span>
                <NavLink to="/admin/dictionaries" className={mobileNavLinkClass}>
                  Матеріали і техніки
                </NavLink>
                <NavLink to="/admin/users" className={mobileNavLinkClass}>
                  Користувачі
                </NavLink>
                <NavLink to="/admin/orders" className={mobileNavLinkClass}>
                  Замовлення
                  {pendingOrdersCount > 0 && (
                    <span className={styles.navBadge}>{pendingOrdersCount}</span>
                  )}
                </NavLink>
                <NavLink to="/admin/settings" className={mobileNavLinkClass}>
                  Налаштування
                </NavLink>
                <NavLink to="/admin/support" className={mobileNavLinkClass}>
                  Підтримка
                  {unreadSupportCount > 0 && (
                    <span className={styles.navBadge}>{unreadSupportCount}</span>
                  )}
                </NavLink>
                <NavLink to="/admin/giveaways" className={mobileNavLinkClass}>
                  Розіграш
                </NavLink>
                <NavLink to="/admin/mail" className={mobileNavLinkClass}>
                  Журнал листів
                </NavLink>
              </>
            )}

            <div className={styles.mobileDivider} />

            {user ? (
              <button onClick={handleLogout} className={styles.mobileLogout}>
                Вийти
              </button>
            ) : (
              <NavLink to="/login" className={mobileNavLinkClass}>
                Увійти
              </NavLink>
            )}
          </nav>
        </>
      )}
    </header>
  );
}
