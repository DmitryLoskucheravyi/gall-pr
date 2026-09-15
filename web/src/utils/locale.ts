import { isLocale } from '../hooks/useLocale';

// Drops the leading /ua or /en segment, so code written against the site's
// old (unprefixed) paths — an exact match against '/register', a lookup
// table keyed by '/catalog' — keeps working unchanged once every real
// pathname gains a locale prefix. Returns '/' for the locale root itself.
export function stripLocale(pathname: string): string {
  const [, first, ...rest] = pathname.split('/');
  if (!isLocale(first)) return pathname;
  const remainder = rest.join('/');
  return remainder ? `/${remainder}` : '/';
}
