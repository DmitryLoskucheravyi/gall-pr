import type { Metadata } from 'next';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import View from '@/views/CatalogPage';
import { pageMetadata, canonicalFor } from '@/lib/metadata';
import { makeQueryClient } from '@/lib/queryClient';
import { serverFetch, serverFetchOrNull } from '@/lib/api-server';
import { queryKeys } from '@/lib/queryKeys';
import { pickLocale } from '@/utils/localizedField';
import { safeJsonLd } from '@/utils/safeUrl';
import { DEFAULT_LOCALE, isLocale } from '@/utils/locale';
import type { PaintingsResponse } from '@/types/painting.types';

// The catalogue, rendered on the server.
//
// It used to be metadata and nothing else: correct <title>, and a body of
// twenty-four skeletons. That is the worst shape a catalogue can have for
// search, because this is the page that links to every painting — a crawler
// that finds no links here has to discover the works from sitemap.xml alone,
// and none of the internal linking that actually ranks a catalogue exists in
// the markup.
//
// The fix is the one the painting page already uses: fetch on the server,
// seed a QueryClient with the exact key the view will ask for, and dehydrate
// it into the HTML. The view itself is untouched — a 'use client' component
// still renders on the server, so with the data already in its cache that
// pass produces the real grid instead of the skeletons.

// The listing changes when the artist uploads, which is not often enough to
// pay for rendering this per request.
export const revalidate = 3600;

// Exactly what CatalogPage asks for on its first render: `priceFilter` starts
// as null there, so the price bounds are absent from this first query and the
// key must be absent of them too. Get this wrong and the cache is seeded under
// a key nothing reads — the page would still show skeletons and the server
// work would be silently wasted.
const FIRST_PAGE = {
  page: 1,
  limit: 24,
  isAvailable: true,
  sort: 'newest',
} as const;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return pageMetadata(locale, '/catalog', {
    namespace: 'catalog',
    titleKey: 'pageTitle',
    descriptionKey: 'pageDescription',
  });
}

export default async function Page({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  // The listing throws on failure rather than resolving to null, and that is
  // the whole point.
  //
  // Swallowing the error would render a catalogue of twenty-four skeletons and
  // answer 200, and under ISR that contentless page is what gets cached for
  // the next hour — served to every crawler that asks, with nothing in the
  // status code to say anything went wrong. Letting it throw means a failed
  // regeneration keeps serving the last render that worked, which is the
  // behaviour worth having on the page the whole catalogue is discovered from.
  //
  // The price range still resolves to null on failure: the filter loses its
  // bounds until the client fetches them, which is a smaller page rather than
  // an empty one, and not worth failing the render over.
  const [paintings, priceRange] = await Promise.all([
    serverFetch<PaintingsResponse>(
      `/paintings?page=${FIRST_PAGE.page}&limit=${FIRST_PAGE.limit}&isAvailable=true&sort=${FIRST_PAGE.sort}`,
      { revalidate: 3600, tags: ['paintings'] },
    ),
    serverFetchOrNull<{ min: number; max: number }>('/paintings/price-range', {
      revalidate: 3600,
      tags: ['paintings'],
    }),
  ]);

  const queryClient = makeQueryClient();

  queryClient.setQueryData(queryKeys.paintings.list(FIRST_PAGE), paintings);

  if (priceRange) {
    queryClient.setQueryData(queryKeys.paintings.priceRange(), priceRange);
  }

  // The works as an ordered list, so a crawler reads the catalogue as a
  // catalogue rather than as twenty-four unrelated links. Each entry points at
  // the painting's own page, where the Product data lives — repeating the
  // price and availability here would only give search two copies to
  // disagree over.
  const itemList = paintings.data.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        numberOfItems: paintings.total,
        itemListElement: paintings.data.map((painting, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: canonicalFor(locale, `/painting/${painting.id}`),
          name: pickLocale(painting, 'title', locale),
        })),
      }
    : null;

  return (
    <>
      {itemList && (
        <script
          type="application/ld+json"
          // safeJsonLd, not a bare stringify: a painting's title is
          // admin-editable and ends up inside a <script> block, where a
          // literal "</script>" would close it early.
          dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }}
        />
      )}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <View />
      </HydrationBoundary>
    </>
  );
}
