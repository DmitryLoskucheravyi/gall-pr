'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link, LocalizedNavLink as NavLink } from '../ui/LocalizedLink';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { toggleTheme } from '../../store/slices/themeSlice';
import { authService } from '../../api/auth.api';
import { useQueryClient } from '@tanstack/react-query';
import { useCartCount } from '../../hooks/queries/useCart';
import { useAdminPendingOrdersCount } from '../../hooks/queries/useOrders';
import { useAdminPendingReviewsCount } from '../../hooks/queries/useReviews';
import { useAdminUnreadSupportCount } from '../../hooks/queries/useSupport';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useLocale, type Locale } from '../../hooks/useLocale';
import { stripLocale } from '../../utils/locale';
import styles from './Header.module.scss';
import { useSettings } from '../../hooks/queries/useSettings';
import { safeExternalUrl } from '../../utils/safeUrl';
import { openCookieSettings } from '../../lib/consent';
import BrandLogo from '../ui/BrandLogo';
import CartVines from './CartVines';
import BrandLockup from '../ui/BrandLockup';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.navLink} ${isActive ? styles.active : ''}`;

const adminNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.adminMenuLink} ${isActive ? styles.active : ''}`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.mobileNavLink} ${isActive ? styles.active : ''}`;

type Props = {
  // Shorter vertical padding for AuthPage's full-bleed screen — see
  // Layout.tsx. The height this publishes as --header-height (below)
  // shrinks along with it, so AuthPage's own full-height math stays correct
  // without anything there needing to know the pixel value.
  compact?: boolean;
};

export default function Header({ compact = false }: Props) {
  const { t } = useTranslation('header');
  const router = useRouter();
  // Signing out must drop every cached response — the next visitor on this
  // browser is a different person as far as the cache is concerned.
  const queryClient = useQueryClient();
  const navigate = useLocalizedNavigate();
  const pathname = usePathname();
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  // The session is re-established from the refresh cookie after the page
  // loads, so for a moment we don't know who this is. Showing the signed-out
  // branch during that window flashes "Увійти" on every reload for someone who
  // is in fact signed in — better to show neither until the answer arrives.
  const authKnown = useAppSelector((state) => state.auth.isBootstrapped);
  const cartCount = useCartCount();
  const pendingOrdersCount = useAdminPendingOrdersCount();
  const pendingReviewsCount = useAdminPendingReviewsCount();
  const unreadSupportCount = useAdminUnreadSupportCount();
  const isDark = useAppSelector((state) => state.theme.isDark);

  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // The drawer's two folding groups.
  const [drawerGroup, setDrawerGroup] = useState<'support' | null>(null);
  const { t: tf } = useTranslation('footer');
  const { data: siteSettings } = useSettings();
  // Instagram and Facebook, as icons at the foot of the drawer — each only
  // when the admin has filled it in.
  const socialLinks: { key: 'instagram' | 'facebook'; label: string; url: string }[] = [];
  const instagram = safeExternalUrl(siteSettings?.instagramUrl);
  const facebook = safeExternalUrl(siteSettings?.facebookUrl);
  if (instagram) socialLinks.push({ key: 'instagram', label: 'Instagram', url: instagram });
  if (facebook) socialLinks.push({ key: 'facebook', label: 'Facebook', url: facebook });
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsAdminMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

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

  // Clear over the hero: while the page's hero (marked data-hero-under-header)
  // is still behind the header, the header drops its glass and turns its ink
  // light, so the footage shows through and the logo reads on it. Off again
  // as soon as the hero has scrolled out from under it.
  const [overHero, setOverHero] = useState(false);
  useEffect(() => {
    const header = headerRef.current;
    const hero = document.querySelector<HTMLElement>('[data-hero-under-header]');
    if (!header || !hero) {
      setOverHero(false);
      return;
    }

    let frame = 0;
    const check = () => {
      frame = 0;
      setOverHero(hero.getBoundingClientRect().bottom > header.offsetHeight + 1);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };

    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pathname]);

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

  // The server has to be told: it holds the refresh cookie, and the page
  // cannot clear an httpOnly one itself. This used to only reset Redux, which
  // left the session alive server-side — reloading would have signed you back
  // in. Local state is cleared either way, so a failed request still logs you
  // out here rather than stranding you in a half-signed-in header.
  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      dispatch(logout());
      queryClient.clear();
      navigate('/');
    }
  };

  const handleThemeToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    // The class on <html> is what the stylesheets actually read. It's set
    // here, in the same synchronous step as the store, so the view transition
    // below snapshots the page already in its new theme.
    const applyToggle = () => {
      document.documentElement.classList.toggle('dark', !isDark);
      dispatch(toggleTheme());
    };

    // Every CSS transition on the page is held off for the length of the
    // switch. Without this, each element with a colour transition of its own
    // (buttons, cards, arrows) started fading from the old palette at the
    // moment the view transition took its snapshot — so the "new" page it
    // revealed was half in the old colours, and the live page then finished
    // the fade after the circle had closed: the flash.
    const root = document.documentElement;
    root.classList.add('theme-switching');
    const release = () => {
      // Two frames, so the new colours are painted before transitions return.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => root.classList.remove('theme-switching')),
      );
    };

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (!document.startViewTransition || prefersReducedMotion) {
      applyToggle();
      release();
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    root.style.setProperty('--theme-toggle-x', `${x}px`);
    root.style.setProperty('--theme-toggle-y', `${y}px`);
    root.style.setProperty('--theme-toggle-r', `${radius}px`);

    const transition = document.startViewTransition(() => {
      flushSync(applyToggle);
    });
    transition.finished.finally(release);
  };

  // Swaps the locale segment and keeps everything after it — switching
  // language mid-page stays on that page, it doesn't bounce home.
  const otherLocale: Locale = locale === 'ua' ? 'en' : 'ua';
  const handleLanguageToggle = () => {
    // The raw router, not the localised one: this is the one navigation that
    // deliberately switches locale rather than staying in the current one.
    //
    // The query string is read here, at click time, rather than through
    // useSearchParams during render. That hook forces every page containing
    // this header out of static rendering and into a Suspense bailout — and
    // the value is only ever needed the moment someone presses the switch.
    const query = typeof window === 'undefined' ? '' : window.location.search;
    router.push(`/${otherLocale}${stripLocale(pathname)}${query}`);
  };

  // Both icons are always rendered and CSS shows the right one off the
  // `dark` class on <html>. The server cannot know the theme — it lives in the
  // visitor's browser — so picking the icon in JS made the server's markup and
  // the client's first render disagree for every dark-theme visitor.
  const themeIcon = (
    <>
      <svg viewBox="0 0 24 24" fill="none" className={styles.themeIconSun}>
        <path
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36-.7-.7M6.34 6.34l-.7-.7m12.72 0-.7.7M6.34 17.66l-.7.7M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <svg viewBox="0 0 24 24" fill="none" className={styles.themeIconMoon}>
        <path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
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
    <header
      ref={headerRef}
      className={`${styles.header} ${compact ? styles.compact : ''}`}
      data-over-hero={overHero || undefined}
    >
      <div className={styles.inner}>
        <Link to="/" className={styles.logo} aria-label="Viktorumm art">
          <BrandLockup className={styles.logoDesktop} />
          <BrandLogo variant="wordmark" className={styles.logoImage} />
        </Link>

        <nav className={styles.nav}>
          <NavLink to="/" className={navLinkClass} end>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/catalog" className={navLinkClass}>
            {t('nav.catalog')}
          </NavLink>
          <NavLink to="/gallery" className={navLinkClass}>
            {t('nav.gallery')}
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
                {t('admin.menu')}
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
                  <NavLink to="/admin/analytics" className={adminNavLinkClass}>
                    {t('admin.analytics')}
                  </NavLink>
                  <NavLink to="/admin/dictionaries" className={adminNavLinkClass}>
                    {t('admin.dictionaries')}
                  </NavLink>
                  <NavLink to="/admin/series" className={adminNavLinkClass}>
                    {t('admin.series')}
                  </NavLink>
                  <NavLink to="/admin/users" className={adminNavLinkClass}>
                    {t('admin.users')}
                  </NavLink>
                  <NavLink to="/admin/reviews" className={adminNavLinkClass}>
                    {t('admin.reviews')}
                    {pendingReviewsCount > 0 && (
                      <span className={styles.navBadge}>{pendingReviewsCount}</span>
                    )}
                  </NavLink>
                  <NavLink to="/admin/orders" className={adminNavLinkClass}>
                    {t('admin.orders')}
                    {pendingOrdersCount > 0 && (
                      <span className={styles.navBadge}>{pendingOrdersCount}</span>
                    )}
                  </NavLink>
                  <NavLink to="/admin/settings" className={adminNavLinkClass}>
                    {t('admin.settings')}
                  </NavLink>
                  <NavLink to="/admin/support" className={adminNavLinkClass}>
                    {t('admin.support')}
                    {unreadSupportCount > 0 && (
                      <span className={styles.navBadge}>{unreadSupportCount}</span>
                    )}
                  </NavLink>
                  <NavLink to="/admin/giveaways" className={adminNavLinkClass}>
                    {t('admin.giveaways')}
                  </NavLink>
                  <NavLink to="/admin/mail" className={adminNavLinkClass}>
                    {t('admin.mail')}
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {user && (
            <NavLink to="/favorites" className={navLinkClass}>
              {t('nav.favorites')}
            </NavLink>
          )}

          <button
            onClick={handleThemeToggle}
            aria-label={t('themeToggle')}
            className={styles.themeButton}
          >
            {themeIcon}
          </button>

          <button
            onClick={handleLanguageToggle}
            aria-label={t('languageToggle')}
            className={styles.languageButton}
          >
            {otherLocale.toUpperCase()}
          </button>

          {!authKnown ? null : user ? (
            // The menu opens on hover and on keyboard focus (focus-within), so
            // a Tab from the profile icon lands on "log out" and reveals it.
            <div className={styles.userGroup}>
              <NavLink
                to="/profile"
                aria-label={t('profileAria')}
                className={({ isActive }) =>
                  `${styles.profileButton} ${isActive ? styles.active : ''}`
                }
              >
                {profileIcon}
              </NavLink>
              <div className={styles.userMenu}>
              <button
                onClick={handleLogout}
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
                <span>{t('nav.logout')}</span>
              </button>
              </div>
            </div>
          ) : (
            <NavLink to="/login" className={navLinkClass}>
              {t('nav.login')}
            </NavLink>
          )}

          {/* Last, at the header's edge: the cart is where a visit is meant
              to end, so it closes the row. */}
          <NavLink
            to="/cart"
            aria-label={t('cartAria')}
            className={({ isActive }) =>
              `${styles.cartButton} ${isActive ? styles.active : ''}`
            }
          >
            {/* data-cart-target sits on the icon, not the link: the flying
                thumbnail from "add to cart" aims at it, and the link is now
                wider than the icon by the width of its label. */}
            <span className={styles.cartIcon} data-cart-target>
              <CartVines />
              <span className={styles.cartGlyph}>{cartIcon}</span>
              {cartCount > 0 && (
                <span className={styles.cartBadge}>{cartCount}</span>
              )}
            </span>
            <span className={styles.cartLabel}>{t('nav.cart')}</span>
          </NavLink>
        </nav>

        <div className={styles.mobileActions}>
          {/* Everything else lives in the drawer. On a phone the cart has
              no icon up here (the desktop header keeps one): the floating
              cart (cart/FloatingCart) takes over as soon as there is
              something in it. */}
          <button
            onClick={handleThemeToggle}
            aria-label={t('themeToggle')}
            className={styles.themeButton}
          >
            {themeIcon}
          </button>

          <button
            onClick={handleLanguageToggle}
            aria-label={t('languageToggle')}
            className={styles.languageButton}
          >
            {otherLocale.toUpperCase()}
          </button>

          {/* The one slot that differs by role: an admin's most-used screen
              here is the support inbox, a customer's is their saved works. */}
          {user?.role === 'ADMIN' && (
            <NavLink
              to="/admin/support"
              aria-label={
                unreadSupportCount > 0
                  ? t('supportUnread', { count: unreadSupportCount })
                  : t('supportAria')
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
              aria-label={t('nav.favorites')}
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
              aria-label={t('profileAria')}
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
            aria-label={isMobileMenuOpen ? t('menuClose') : t('menuOpen')}
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

      {/* A drawer from the right edge, the full height of the screen. Portalled
          to <body>: the header's backdrop-filter makes it the containing block
          for anything fixed inside it, which would hold the drawer to the
          header's own box. */}
      {isMobileMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className={styles.drawerRoot}>
            <div
              className={styles.mobileBackdrop}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <nav className={styles.mobilePanel} aria-label={t('menuOpen')}>
              <div className={styles.drawerHead}>
                <BrandLogo variant="lockup" height={44} className={styles.drawerBrand} />
                <button
                  type="button"
                  className={styles.drawerClose}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label={t('menuClose')}
                >
                  <MenuIcon name="close" />
                </button>
              </div>

              <div className={styles.drawerBody}>
                <NavLink to="/" className={mobileNavLinkClass} end>
                  <MenuIcon name="home" />
                  {t('nav.home')}
                </NavLink>
                <NavLink to="/catalog" className={mobileNavLinkClass}>
                  <MenuIcon name="catalog" />
                  {t('nav.catalog')}
                </NavLink>
                <NavLink to="/gallery" className={mobileNavLinkClass}>
                  <MenuIcon name="gallery" />
                  {t('nav.gallery')}
                </NavLink>
                <NavLink to="/cart" className={mobileNavLinkClass}>
                  <MenuIcon name="cart" />
                  {t('nav.cart')}
                  {cartCount > 0 && <span className={styles.navBadge}>{cartCount}</span>}
                </NavLink>
                <NavLink to="/orders" className={mobileNavLinkClass}>
                  <MenuIcon name="orders" />
                  {t('nav.orders')}
                </NavLink>

                {user && (
                  <>
                    <NavLink to="/favorites" className={mobileNavLinkClass}>
                      <MenuIcon name="heart" />
                      {t('nav.favorites')}
                    </NavLink>
                    <NavLink to="/profile" className={mobileNavLinkClass}>
                      <MenuIcon name="profile" />
                      {t('profileAria')}
                    </NavLink>
                  </>
                )}

                <div className={styles.mobileDivider} />

                {/* Help and the shop's documents, folded until asked for. */}
                <button
                  type="button"
                  className={styles.drawerGroup}
                  aria-expanded={drawerGroup === 'support'}
                  onClick={() => setDrawerGroup((g) => (g === 'support' ? null : 'support'))}
                >
                  <MenuIcon name="help" />
                  {tf('columns.help')}
                  <MenuIcon name="chevron" />
                </button>
                <div className={styles.drawerSub} data-open={drawerGroup === 'support' || undefined}>
                  <div>
                    <NavLink to="/support" className={mobileNavLinkClass}>
                      <MenuIcon name="chat" />
                      {tf('nav.support')}
                    </NavLink>
                    {siteSettings?.supportTelegramUrl && safeExternalUrl(siteSettings.supportTelegramUrl) ? (
                      <a
                        href={safeExternalUrl(siteSettings.supportTelegramUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.mobileNavLink}
                      >
                        <MenuIcon name="telegram" />
                        {tf('nav.telegramBot')}
                      </a>
                    ) : null}
                    <NavLink to="/delivery" className={mobileNavLinkClass}>
                      <MenuIcon name="truck" />
                      {tf('nav.delivery')}
                    </NavLink>
                    <NavLink to="/returns" className={mobileNavLinkClass}>
                      <MenuIcon name="returns" />
                      {tf('nav.returns')}
                    </NavLink>
                    <NavLink to="/offer" className={mobileNavLinkClass}>
                      <MenuIcon name="document" />
                      {tf('nav.offer')}
                    </NavLink>
                    <NavLink to="/privacy" className={mobileNavLinkClass}>
                      <MenuIcon name="shield" />
                      {tf('nav.privacy')}
                    </NavLink>
                    <button
                      type="button"
                      className={styles.mobileNavLink}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        openCookieSettings();
                      }}
                    >
                      <MenuIcon name="cookie" />
                      {tf('nav.cookieSettings')}
                    </button>
                  </div>
                </div>

                {user?.role === 'ADMIN' && (
                  <>
                    <div className={styles.mobileDivider} />
                    <span className={styles.mobileGroupLabel}>{t('adminGroupLabel')}</span>
                    <NavLink to="/admin/analytics" className={mobileNavLinkClass}>
                      <MenuIcon name="analytics" />
                      {t('admin.analytics')}
                    </NavLink>
                    <NavLink to="/admin/orders" className={mobileNavLinkClass}>
                      <MenuIcon name="orders" />
                      {t('admin.orders')}
                      {pendingOrdersCount > 0 && (
                        <span className={styles.navBadge}>{pendingOrdersCount}</span>
                      )}
                    </NavLink>
                    <NavLink to="/admin/reviews" className={mobileNavLinkClass}>
                      <MenuIcon name="star" />
                      {t('admin.reviews')}
                      {pendingReviewsCount > 0 && (
                        <span className={styles.navBadge}>{pendingReviewsCount}</span>
                      )}
                    </NavLink>
                    <NavLink to="/admin/support" className={mobileNavLinkClass}>
                      <MenuIcon name="chat" />
                      {t('admin.support')}
                      {unreadSupportCount > 0 && (
                        <span className={styles.navBadge}>{unreadSupportCount}</span>
                      )}
                    </NavLink>
                    <NavLink to="/admin/series" className={mobileNavLinkClass}>
                      <MenuIcon name="layers" />
                      {t('admin.series')}
                    </NavLink>
                    <NavLink to="/admin/dictionaries" className={mobileNavLinkClass}>
                      <MenuIcon name="book" />
                      {t('admin.dictionaries')}
                    </NavLink>
                    <NavLink to="/admin/giveaways" className={mobileNavLinkClass}>
                      <MenuIcon name="gift" />
                      {t('admin.giveaways')}
                    </NavLink>
                    <NavLink to="/admin/users" className={mobileNavLinkClass}>
                      <MenuIcon name="users" />
                      {t('admin.users')}
                    </NavLink>
                    <NavLink to="/admin/mail" className={mobileNavLinkClass}>
                      <MenuIcon name="mail" />
                      {t('admin.mail')}
                    </NavLink>
                    <NavLink to="/admin/settings" className={mobileNavLinkClass}>
                      <MenuIcon name="settings" />
                      {t('admin.settings')}
                    </NavLink>
                  </>
                )}
              </div>

              <div className={styles.drawerFoot}>
                {/* Sign in or out on the left; the shop's social profiles as
                    bare icons on the right. */}
                {socialLinks.length > 0 && (
                  <div className={styles.drawerSocial}>
                    {socialLinks.map((link) => (
                      <a
                        key={link.key}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={link.label}
                        title={link.label}
                      >
                        <MenuIcon name={link.key} />
                      </a>
                    ))}
                  </div>
                )}
                {!authKnown ? null : user ? (
                  <button onClick={handleLogout} className={styles.mobileLogout}>
                    <MenuIcon name="logout" />
                    {t('nav.logout')}
                  </button>
                ) : (
                  <NavLink to="/login" className={mobileNavLinkClass}>
                    <MenuIcon name="login" />
                    {t('nav.login')}
                  </NavLink>
                )}
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </header>
  );
}

// Line icons for the mobile drawer, drawn on a 24 grid in the same stroke as
// the rest of the site's icons.
const MENU_ICONS: Record<string, string> = {
  home: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
  catalog: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  gallery: 'M4 5h16v14H4zM4 15l4.5-4.5L13 15l2.5-2.5L20 17M15.5 9.2a1.2 1.2 0 1 0 0-.1',
  cart: 'M3 4h2.2l2.2 10.3a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.7L20 8H6.2M9.5 19.5h.1M16.5 19.5h.1',
  orders: 'M7 3.5h10a1 1 0 0 1 1 1V20.5l-2.5-1.5-2.5 1.5-2.5-1.5L8 20.5 6 19V4.5a1 1 0 0 1 1-1zM9 8h6M9 11.5h6M9 15h3.5',
  heart: 'M12 19.5s-7.5-4.3-7.5-9.6A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.3c0 5.3-7.5 9.6-7.5 9.6z',
  profile: 'M12 12a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6zM4.8 20c.8-3.6 3.6-5.6 7.2-5.6s6.4 2 7.2 5.6',
  analytics: 'M4 20h16M6.5 16.5v-4M11 16.5V8M15.5 16.5v-6M20 16.5V5',
  star: 'M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z',
  chat: 'M5 5.5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 3v-3H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z',
  layers: 'M12 4 3.5 8.5 12 13l8.5-4.5zM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5',
  book: 'M5 5.5A1.5 1.5 0 0 1 6.5 4H19v14H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19',
  gift: 'M4 9h16v3H4zM5.5 12h13v8h-13zM12 9v11M12 9c-1.5-3.5-5-3.5-5-1.2C7 9 9 9 12 9zM12 9c1.5-3.5 5-3.5 5-1.2C17 9 15 9 12 9z',
  users: 'M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11zM3 19.5c.6-3 2.9-4.7 6-4.7s5.4 1.7 6 4.7M16 5a3 3 0 0 1 0 5.8M18 14.9c1.6.6 2.7 2 3 4.6',
  mail: 'M4 6h16v12H4zM4.5 6.5 12 13l7.5-6.5',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1',
  login: 'M10 8V5.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V16M3.5 12H14M10.5 8.5 14 12l-3.5 3.5',
  logout: 'M14 8V5.5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V16M9.5 12H20.5M17 8.5l3.5 3.5-3.5 3.5',
  close: 'M6 6l12 12M18 6 6 18',
  chevron: 'M8 10l4 4 4-4',
  help: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2-2.4 3.6M12 16.8h.01',
  telegram: 'M20.5 4.5 3.6 11.1c-.8.3-.7 1.4.1 1.6l4.2 1.2 1.6 5c.2.7 1.1.9 1.6.3l2.3-2.4 4.2 3.1c.6.4 1.4.1 1.6-.6l2.6-12.6c.2-.8-.6-1.5-1.3-1.2zM7.9 13.9 17.5 7.5l-7.2 7.6',
  truck: 'M3 6.5h11v9.5H3zM14 9.5h3.6l3.4 3.4v3.1h-7M7 18.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM17 18.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z',
  returns: 'M9 7H4.5V2.5M4.6 7A8.5 8.5 0 1 1 3.5 12',
  document: 'M6.5 3.5h7.5l4 4v13h-11.5zM13.5 3.5V8h4.5M9 12h6M9 15.5h6',
  shield: 'M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6zM9.2 12l2 2 3.6-3.8',
  cookie: 'M20.5 12.6A8.5 8.5 0 1 1 11.4 3.5a3 3 0 0 0 3.6 3.6 3 3 0 0 0 3.6 3.6 3 3 0 0 0 1.9 1.9zM8.5 10h.01M9.5 15h.01M14.5 14.5h.01',
  instagram: 'M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4zM12 15.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2zM17.2 6.8h.01',
  facebook: 'M14.5 8.5h2.3V5h-2.3c-2.3 0-3.8 1.6-3.8 3.9V11H8.5v3.4h2.2v6.1h3.4v-6.1h2.5l.5-3.4h-3V9.4c0-.5.4-.9.9-.9z',
};

function MenuIcon({ name }: { name: keyof typeof MENU_ICONS }) {
  return (
    <svg className={styles.menuIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path d={MENU_ICONS[name]} />
    </svg>
  );
}
