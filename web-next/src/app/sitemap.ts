import type { MetadataRoute } from 'next';

import { serverFetchOrNull } from '../lib/api-server';
import { alternatesFor } from '../lib/metadata';
import { LOCALES } from '../utils/locale';

// Replaces web/functions/sitemap.xml.ts, which existed only because the Vite
// build had no server to generate one.

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://viktorumm.com'
).replace(/\/$/, '');

// Public, indexable routes. Everything behind a login — cart, orders, profile,
// favourites, the whole admin — is deliberately absent, and each of those pages
// also carries `robots: { index: false }` of its own.
const STATIC_PATHS = ['/', '/catalog', '/gallery', '/support'];

export const revalidate = 3600;

function entriesFor(
  path: string,
  lastModified: Date | undefined,
  priority: number,
): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}${path === '/' ? '' : path}`,
    lastModified,
    priority,
    alternates: { languages: alternatesFor(path) },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [paintings, giveaways] = await Promise.all([
    serverFetchOrNull<{ data: { id: number; updatedAt?: string }[] }>(
      '/paintings?page=1&limit=1000',
      { revalidate: 3600 },
    ),
    serverFetchOrNull<{ id: number; updatedAt?: string }[]>('/giveaways', {
      revalidate: 3600,
    }),
  ]);

  return [
    ...STATIC_PATHS.flatMap((path) =>
      entriesFor(path, undefined, path === '/' ? 1 : 0.8),
    ),
    ...(paintings?.data ?? []).flatMap((painting) =>
      entriesFor(
        `/painting/${painting.id}`,
        painting.updatedAt ? new Date(painting.updatedAt) : undefined,
        0.9,
      ),
    ),
    ...(giveaways ?? []).flatMap((giveaway) =>
      entriesFor(
        `/giveaways/${giveaway.id}`,
        giveaway.updatedAt ? new Date(giveaway.updatedAt) : undefined,
        0.5,
      ),
    ),
  ];
}
