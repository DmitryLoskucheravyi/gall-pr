import type { MetadataRoute } from 'next';

import { LOCALES } from '../utils/locale';

// Replaces web/public/robots.txt. Generated so the disallow list and the locale
// list cannot drift apart — the static file spelled every path out twice, once
// per language, by hand.

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://viktorumm.com'
).replace(/\/$/, '');

// Behind a login, personal to one visitor, or a dead end for a crawler.
// Indexing these wastes crawl budget on pages that can never rank and, in the
// case of the admin, advertises where the doors are.
const PRIVATE_PATHS = [
  '/cart',
  '/orders',
  '/profile',
  '/favorites',
  '/admin/',
  // Nothing to rank for, and the reset link carries a token.
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  // One visitor's conversation.
  '/support/chat',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: LOCALES.flatMap((locale) =>
        PRIVATE_PATHS.map((path) => `/${locale}${path}`),
      ),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
