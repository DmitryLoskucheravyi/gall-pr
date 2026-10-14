'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { useLocale } from './useLocale';
import { hasInAppHistory } from '../lib/inAppHistory';
import { withLocale } from '../utils/locale';

/**
 * A "back" that always lands on the site: the previous page when the visitor
 * came here from another page of ours, otherwise `fallback` — the page this
 * one logically belongs under (a painting → the catalogue). Someone who opened
 * a shared link has no history of ours to step back through.
 */
export function useBack(fallback: string) {
  const router = useRouter();
  const locale = useLocale();

  return useCallback(() => {
    if (hasInAppHistory()) router.back();
    else router.push(withLocale(fallback, locale));
  }, [router, locale, fallback]);
}
