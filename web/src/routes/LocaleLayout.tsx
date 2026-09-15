import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';

import i18n from '../i18n';
import { isLocale } from '../hooks/useLocale';

// Every route in the app lives under here — this is the only place that
// reads the raw :locale param. An unrecognised or missing segment (a bare
// legacy path like /catalog, or outright garbage) redirects to the same
// pathname under /ua rather than losing it: '/catalog' becomes
// '/ua/catalog', not just '/ua'.
export default function LocaleLayout() {
  const { locale } = useParams<{ locale: string }>();
  const location = useLocation();
  const valid = isLocale(locale);

  useEffect(() => {
    if (!valid) return;
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale === 'en' ? 'en' : 'uk';
  }, [locale, valid]);

  if (!valid) {
    return <Navigate to={`/ua${location.pathname}${location.search}`} replace />;
  }

  return <Outlet />;
}
