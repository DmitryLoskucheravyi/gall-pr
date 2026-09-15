import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NavigateOptions } from 'react-router-dom';

import { useLocale } from './useLocale';

// The `navigate('/orders')`-style counterpart to LocalizedLink — prefixes a
// site-relative path with the current locale before handing it to the real
// navigate(). A history-relative call (navigate(-1)) is passed through
// untouched: there's no path to prefix.
export function useLocalizedNavigate() {
  const navigate = useNavigate();
  const locale = useLocale();

  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigate(to);
        return;
      }
      if (/^([a-z]+:)?\/\//i.test(to) || /^\/(ua|en)(\/|$)/.test(to)) {
        navigate(to, options);
        return;
      }
      if (to === '/') {
        navigate(`/${locale}`, options);
        return;
      }
      navigate(`/${locale}${to.startsWith('/') ? to : `/${to}`}`, options);
    },
    [navigate, locale],
  );
}
