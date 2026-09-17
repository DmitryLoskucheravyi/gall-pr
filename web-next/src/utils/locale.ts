// Everything about locales that is pure string work.
//
// No React here on purpose: a Server Component needs `stripLocale` and
// `isLocale` too, and importing them from a hook module marked 'use client'
// would drag the whole client boundary along with them.
export type Locale = 'ua' | 'en';

export const LOCALES: Locale[] = ['ua', 'en'];
export const DEFAULT_LOCALE: Locale = 'ua';

export function isLocale(value: string | undefined): value is Locale {
  return value === 'ua' || value === 'en';
}

// Drops the leading /ua or /en segment, so code written against the site's
// old (unprefixed) paths — an exact match against '/register', a lookup table
// keyed by '/catalog' — keeps working unchanged. Returns '/' for the locale
// root itself.
export function stripLocale(pathname: string): string {
  const [, first, ...rest] = pathname.split('/');
  if (!isLocale(first)) return pathname;

  const remainder = rest.join('/');

  return remainder ? `/${remainder}` : '/';
}

// Prefixes a site-relative path with a locale. An absolute external URL
// (http://…) or one that already carries a locale prefix is left alone; only a
// bare site-relative path gets one.
export function withLocale(to: string, locale: string): string {
  if (/^([a-z]+:)?\/\//i.test(to) || /^\/(ua|en)(\/|$)/.test(to)) return to;
  if (to === '/') return `/${locale}`;

  return `/${locale}${to.startsWith('/') ? to : `/${to}`}`;
}
