'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { useLocale } from './useLocale';
import { withLocale } from '../utils/locale';

type NavigateOptions = { replace?: boolean; scroll?: boolean };

// The `navigate('/orders')`-style counterpart to LocalizedLink — prefixes a
// site-relative path with the current locale before handing it to the router.
// A history-relative call (navigate(-1)) still goes back: Next's router has
// back() rather than a numeric argument, and -1 is the only value the app
// ever passed.
export function useLocalizedNavigate() {
  const router = useRouter();
  const locale = useLocale();

  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        // Only ever called as navigate(-1). Anything deeper than one step was
        // never used, and Next offers no equivalent, so this is deliberately
        // narrow rather than pretending to support it.
        router.back();
        return;
      }

      const target = withLocale(to, locale);

      if (options?.replace) router.replace(target, { scroll: options.scroll });
      else router.push(target, { scroll: options?.scroll });
    },
    [router, locale],
  );
}
