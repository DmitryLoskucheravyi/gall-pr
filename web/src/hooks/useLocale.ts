import { useParams } from 'react-router-dom';

// The whole site lives under /ua or /en (see routes/LocaleLayout) — this is
// the one place both the literal list and the fallback are written down.
export type Locale = 'ua' | 'en';
export const LOCALES: Locale[] = ['ua', 'en'];
export const DEFAULT_LOCALE: Locale = 'ua';

export function isLocale(value: string | undefined): value is Locale {
  return value === 'ua' || value === 'en';
}

// Every page is a descendant of the /:locale route, so this is always safe
// to call — no provider, no Redux slice, nothing to keep in sync: the URL
// already is the state.
export function useLocale(): Locale {
  const { locale } = useParams<{ locale: string }>();
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}
