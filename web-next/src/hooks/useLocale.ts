'use client';

import { useParams } from 'next/navigation';

import { DEFAULT_LOCALE, isLocale } from '../utils/locale';

// Re-exported so the ~30 call sites that import the type or the list from here
// keep working. The definitions themselves moved to utils/locale.ts, which has
// no React in it and is therefore safe for a Server Component to import.
export type { Locale } from '../utils/locale';
export { LOCALES, DEFAULT_LOCALE, isLocale } from '../utils/locale';

// Every page is a descendant of app/[locale], so this is always safe to call —
// no provider, no Redux slice, nothing to keep in sync: the URL already is the
// state.
//
// Client-only. A Server Component receives `params` directly and should read
// the locale from there rather than reaching for a hook.
export function useLocale() {
  const params = useParams<{ locale?: string }>();
  const locale = Array.isArray(params?.locale)
    ? params.locale[0]
    : params?.locale;

  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}
