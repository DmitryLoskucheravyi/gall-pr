import { forwardRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { LinkProps, NavLinkProps } from 'react-router-dom';

import { useLocale } from '../../hooks/useLocale';

// Prefixes an internal `to` with the current locale, so every existing
// `to="/catalog"` across the app keeps meaning exactly that — the locale
// segment is this component's problem, not each call site's. An absolute
// external URL (http://…) or one that already carries a locale prefix is
// left alone; only a bare site-relative path gets one.
function withLocale(to: string, locale: string): string {
  if (/^([a-z]+:)?\/\//i.test(to) || /^\/(ua|en)(\/|$)/.test(to)) return to;
  if (to === '/') return `/${locale}`;
  return `/${locale}${to.startsWith('/') ? to : `/${to}`}`;
}

export const LocalizedLink = forwardRef<HTMLAnchorElement, LinkProps>(
  function LocalizedLink({ to, ...props }, ref) {
    const locale = useLocale();
    const target = typeof to === 'string' ? withLocale(to, locale) : to;
    return <Link ref={ref} to={target} {...props} />;
  },
);

export const LocalizedNavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  function LocalizedNavLink({ to, ...props }, ref) {
    const locale = useLocale();
    const target = typeof to === 'string' ? withLocale(to, locale) : to;
    return <NavLink ref={ref} to={target} {...props} />;
  },
);
