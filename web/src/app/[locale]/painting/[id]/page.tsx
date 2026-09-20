import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import View from '@/views/PaintingPage';
import { makeQueryClient } from '@/lib/queryClient';
import { ApiError, serverFetch, serverFetchOrNull } from '@/lib/api-server';
import { queryKeys } from '@/lib/queryKeys';
import { alternatesFor, canonicalFor } from '@/lib/metadata';
import { pickLocale } from '@/utils/localizedField';
import { cdnImage } from '@/utils/imageUrl';
import { safeJsonLd } from '@/utils/safeUrl';
import { DEFAULT_LOCALE, isLocale } from '@/utils/locale';
import type { Painting } from '@/types/painting.types';
import type { PublicAppSettings } from '@/types/settings.types';

// The page the whole migration was for.
//
// The painting is fetched on the server twice over: once for generateMetadata,
// and once into a QueryClient that is dehydrated into the HTML. The second is
// what puts the actual content — title, price, description — into the markup a
// crawler reads, because a 'use client' component still renders on the server;
// "client" means it hydrates afterwards, not that the server skips it. With the
// data already in the cache, that server pass renders the real page rather than
// a loading skeleton.
//
// Both calls hit Next's own fetch cache, so it is one request to the API.

// One painting, one static page, revalidated hourly. The catalogue changes when
// the artist uploads, which is not often enough to pay for rendering this on
// every request.
export const revalidate = 3600;

// A work published after the last build is rendered on first request and cached
// from then on, rather than 404ing until a redeploy.
export const dynamicParams = true;

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

// Null means the work genuinely is not there. Anything else throws.
//
// This used to swallow every failure alike, and the caller turned null into
// notFound() — so a momentary API hiccup answered 404. To a crawler a 404 is
// not "try later", it is "this is gone", and the painting drops out of the
// index on the strength of one bad second. A thrown error is the honest
// answer to "I don't know": under ISR the last good render keeps being
// served, and nothing is told to forget the page.
//
// A malformed id is a real absence — no amount of retrying makes
// /painting/abc exist — so that stays null.
async function getPainting(id: string): Promise<Painting | null> {
  if (!/^[1-9]\d*$/.test(id)) return null;

  try {
    return await serverFetch<Painting>(`/paintings/${id}`, {
      revalidate: 3600,
      tags: [`painting:${id}`],
    });
  } catch (error) {
    // The one status that means what notFound() means. A sold-out or hidden
    // work the API answers 404 for is genuinely gone from the public site.
    if (error instanceof ApiError && error.status === 404) return null;

    throw error;
  }
}

export async function generateStaticParams() {
  // Only the first page of the catalogue is pre-rendered at build time. The
  // rest arrive through dynamicParams above — pre-rendering a whole gallery
  // would make every deploy wait on the API for no benefit to anyone but the
  // first visitor of a rarely-viewed work.
  const response = await serverFetchOrNull<{ data: { id: number }[] }>(
    '/paintings?page=1&limit=100',
    { revalidate: 3600 },
  );

  return (response?.data ?? []).map((painting) => ({ id: String(painting.id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const painting = await getPainting(id);
  if (!painting) return { robots: { index: false, follow: false } };

  const title = pickLocale(painting, 'title', locale);
  const subtitle = pickLocale(painting, 'subtitle', locale);
  const body = pickLocale(painting, 'description', locale);

  // The size belongs in the description: it is the first thing anyone asks
  // about a painting and the one fact a thumbnail cannot convey.
  const size =
    painting.width && painting.height
      ? `${painting.width}×${painting.height} см. `
      : '';

  const description = [subtitle, `${size}${body}`]
    .filter(Boolean)
    .join(' — ')
    .replace(/\s+/g, ' ')
    .slice(0, 300);

  const path = `/painting/${painting.id}`;
  const canonical = canonicalFor(locale, path);
  const image = cdnImage(painting.cardImage, 1200);

  return {
    title,
    description,
    alternates: { canonical, languages: alternatesFor(path) },
    openGraph: {
      type: 'article',
      url: canonical,
      title,
      description,
      locale: locale === 'en' ? 'en_US' : 'uk_UA',
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function Page({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const painting = await getPainting(id);
  if (!painting) notFound();

  // The artist's name, for the Product's brand. Public settings, so the server
  // may read them; null on failure because a missing brand is a slightly
  // poorer rich result, not a reason to fail the page.
  const settings = await serverFetchOrNull<PublicAppSettings>('/settings', {
    revalidate: 3600,
    tags: ['settings'],
  });

  // Warm the cache the client view reads from, then hand it across the
  // boundary. usePainting(id) finds it already there and renders the real page
  // on the server pass instead of a skeleton.
  const queryClient = makeQueryClient();
  queryClient.setQueryData(queryKeys.paintings.detail(painting.id), painting);

  if (settings) {
    queryClient.setQueryData(queryKeys.settings.all, settings);
  }

  const title = pickLocale(painting, 'title', locale);
  const description = pickLocale(painting, 'description', locale);
  const authorName = settings ? pickLocale(settings, 'authorName', locale) : '';

  return (
    <>
      {/* The page's only Product block.

          PaintingPage used to render a second one of its own, so every
          painting shipped two, and they disagreed: this one carried
          productionDate and the offer URL, that one carried the brand. Search
          engines pick one of a duplicate pair without announcing which, so
          half the fields were a coin toss. Merged here, in the markup,
          because a rich result is built from what the crawler was served —
          the view's copy only existed once JavaScript had run.

          safeJsonLd, not the hand-rolled escape that used to sit below it.
          That one replaced every '<' with a source literal that IS '<', so it
          swapped each character for itself and did nothing at all. Title and
          description are admin-editable and land inside a <script> block,
          where a literal closing tag would end it early. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: title,
            image: painting.images?.length
              ? painting.images
              : [painting.cardImage],
            ...(description ? { description } : {}),
            ...(authorName
              ? { brand: { '@type': 'Brand', name: authorName } }
              : {}),
            ...(painting.year ? { productionDate: String(painting.year) } : {}),
            offers: {
              '@type': 'Offer',
              url: canonicalFor(locale, `/painting/${painting.id}`),
              price: Number(painting.price),
              priceCurrency: 'UAH',
              availability: painting.isAvailable
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            },
          }),
        }}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <View />
      </HydrationBoundary>
    </>
  );
}
