import type { PagesFunction } from './types';
import { LOCALES, apiBase, escapeHtml, siteOrigin, withTimeout } from './lib/seo';

// /sitemap.xml
//
// Generated on request rather than at build time: the catalogue changes when
// the artist adds a work, and a sitemap baked into the bundle would be stale
// from the first upload. Cached at the edge so this is a handful of API calls
// an hour, not one per crawl.

type ApiPainting = { id: number; updatedAt?: string };
type ApiGiveaway = { id: number; updatedAt?: string; isActive?: boolean };

// Public, indexable routes. Everything behind a login — cart, orders, profile,
// favourites, the whole admin — is deliberately absent, and robots.txt says so
// too: a sitemap is a suggestion, a disallow is the instruction.
const STATIC_PATHS = ['', '/catalog', '/gallery', '/support'];

const PAGE_SIZE = 100;
// A gallery will not outgrow this, and it bounds the work a single request can
// ask the API to do.
const MAX_PAGES = 20;

async function fetchAllPaintings(api: string): Promise<ApiPainting[]> {
  const all: ApiPainting[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await fetch(
      `${api}/paintings?page=${page}&limit=${PAGE_SIZE}`,
      { headers: { accept: 'application/json' }, signal: withTimeout(5000) },
    );

    if (!response.ok) break;

    const body = (await response.json()) as {
      data?: ApiPainting[];
      totalPages?: number;
    };

    all.push(...(body.data ?? []));

    if (!body.totalPages || page >= body.totalPages) break;
  }

  return all;
}

async function fetchGiveaways(api: string): Promise<ApiGiveaway[]> {
  try {
    const response = await fetch(`${api}/giveaways`, {
      headers: { accept: 'application/json' },
      signal: withTimeout(4000),
    });

    if (!response.ok) return [];

    return (await response.json()) as ApiGiveaway[];
  } catch {
    // A sitemap missing its giveaways is still a useful sitemap.
    return [];
  }
}

// One <url> per locale, each listing every locale as an alternate. That
// reciprocal linking is the part search engines actually act on: two languages
// on separate paths with nothing joining them is how a page competes with its
// own translation.
function urlEntry(
  origin: string,
  path: string,
  lastmod: string | undefined,
  priority: string,
): string {
  return LOCALES.map((locale) => {
    const alternates = LOCALES.map(
      (alt) =>
        `    <xhtml:link rel="alternate" hreflang="${alt === 'ua' ? 'uk' : 'en'}" href="${escapeHtml(`${origin}/${alt}${path}`)}"/>`,
    )
      .concat(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(`${origin}/ua${path}`)}"/>`,
      )
      .join('\n');

    return [
      '  <url>',
      `    <loc>${escapeHtml(`${origin}/${locale}${path}`)}</loc>`,
      alternates,
      lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : '',
      `    <priority>${priority}</priority>`,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n');
  }).join('\n');
}

export const onRequestGet: PagesFunction = async (context) => {
  const { request, env } = context;

  const api = apiBase(env);
  const origin = siteOrigin(request);

  // Without an API the static routes are still worth listing — a sitemap with
  // four entries beats a 500.
  const [paintings, giveaways] = api
    ? await Promise.all([
        fetchAllPaintings(api).catch(() => [] as ApiPainting[]),
        fetchGiveaways(api),
      ])
    : [[] as ApiPainting[], [] as ApiGiveaway[]];

  const entries = [
    ...STATIC_PATHS.map((path) =>
      urlEntry(origin, path, undefined, path === '' ? '1.0' : '0.8'),
    ),
    ...paintings.map((painting) =>
      urlEntry(origin, `/painting/${painting.id}`, painting.updatedAt, '0.9'),
    ),
    ...giveaways.map((giveaway) =>
      urlEntry(origin, `/giveaways/${giveaway.id}`, giveaway.updatedAt, '0.5'),
    ),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      // An hour at the edge: crawlers re-fetch a sitemap far more often than a
      // gallery gains a painting.
      'cache-control': 'public, max-age=0, s-maxage=3600',
    },
  });
};
