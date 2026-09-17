'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import type { LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';

import { useLocale } from '../../hooks/useLocale';
import { withLocale } from '../../utils/locale';

// Prefixes an internal `to` with the current locale, so every existing
// `to="/catalog"` across the app keeps meaning exactly that — the locale
// segment is this component's problem, not each call site's.
//
// The prop is still called `to` rather than next/link's `href`: renaming it
// would touch every call site in the app for no gain, and this component
// exists precisely so call sites don't have to know what router is underneath.
type Props = Omit<LinkProps, 'href'> &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    to: string;
  };

export const LocalizedLink = forwardRef<HTMLAnchorElement, Props>(
  function LocalizedLink({ to, ...props }, ref) {
    const locale = useLocale();

    return <Link ref={ref} href={withLocale(to, locale)} {...props} />;
  },
);

// react-router's NavLink took a function for className and gave it
// { isActive }. next/link has no such thing, so the active check is done here
// against the real pathname — same call signature, so no call site changes.
type NavProps = Omit<Props, 'className'> & {
  className?: string | ((state: { isActive: boolean }) => string);
  end?: boolean;
};

export const LocalizedNavLink = forwardRef<HTMLAnchorElement, NavProps>(
  function LocalizedNavLink({ to, className, end = false, ...props }, ref) {
    const locale = useLocale();
    const pathname = usePathname();
    const href = withLocale(to, locale);

    const isActive = end
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

    return (
      <Link
        ref={ref}
        href={href}
        aria-current={isActive ? 'page' : undefined}
        className={typeof className === 'function' ? className({ isActive }) : className}
        {...props}
      />
    );
  },
);
