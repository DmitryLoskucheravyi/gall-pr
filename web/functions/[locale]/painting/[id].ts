import type { PagesFunction } from '../../types';
import {
  SHELL_CACHE,
  apiBase,
  clip,
  injectMeta,
  isLocale,
  siteOrigin,
  socialImage,
  withTimeout,
} from '../../lib/seo';

// /ua/painting/123 and /en/painting/123.
//
// Serves the same index.html the SPA always served, with this painting's title,
// description, price and image written into the tags first — so a link shared
// in Telegram or Instagram shows the work rather than the generic gallery card,
// and a crawler that doesn't run JavaScript still sees a distinct page.

type ApiPainting = {
  id: number;
  title: string;
  titleEn: string | null;
  subtitle: string | null;
  subtitleEn: string | null;
  description: string;
  descriptionEn: string | null;
  price: string | number;
  cardImage: string;
  images: string[];
  isAvailable: boolean;
  width: number | null;
  height: number | null;
  year: number | null;
};

// The English field when it exists and the visitor asked for English; the
// Ukrainian one otherwise. Mirrors the app's own pickLocale so a shared link
// and the page it opens say the same thing.
function pick(
  painting: ApiPainting,
  field: 'title' | 'subtitle' | 'description',
  locale: 'ua' | 'en',
): string {
  if (locale === 'en') {
    const en = painting[`${field}En` as keyof ApiPainting];
    if (typeof en === 'string' && en.trim()) return en;
  }

  const base = painting[field as keyof ApiPainting];
  return typeof base === 'string' ? base : '';
}

export const onRequestGet: PagesFunction<'locale' | 'id'> = async (context) => {
  const { request, env, params, next } = context;

  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale;
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;

  // Anything that isn't a real locale and a positive integer id is not a page
  // this function has an opinion about — hand it back to the SPA untouched.
  if (!isLocale(locale) || !/^[1-9]\d*$/.test(rawId)) {
    return next();
  }

  const api = apiBase(env);
  if (!api) return next();

  try {
    const [shellResponse, paintingResponse] = await Promise.all([
      env.ASSETS.fetch(new Request(new URL('/index.html', request.url).toString())),
      fetch(`${api}/paintings/${rawId}`, {
        headers: { accept: 'application/json' },
        signal: withTimeout(4000),
      }),
    ]);

    // A painting that has been deleted or hidden is a 404 from the API. The SPA
    // renders its own "not found" for that, which is the right page — this
    // function just has nothing to add to it.
    if (!paintingResponse.ok || !shellResponse.ok) return next();

    const painting = (await paintingResponse.json()) as ApiPainting;
    const html = await shellResponse.text();

    const origin = siteOrigin(request);
    const title = pick(painting, 'title', locale);
    const subtitle = pick(painting, 'subtitle', locale);
    const body = pick(painting, 'description', locale);
    const price = Number(painting.price);

    // The size belongs in the description: it is the first thing anyone asks
    // about a painting and the one fact a thumbnail can't convey.
    const size =
      painting.width && painting.height
        ? `${painting.width}×${painting.height} см. `
        : '';

    const description = clip(
      [subtitle, `${size}${body}`].filter(Boolean).join(' — ') ||
        `${title} — оригінальний живопис.`,
    );

    const image = socialImage(painting.cardImage);
    const canonical = `${origin}/${locale}/painting/${painting.id}`;

    const rendered = injectMeta(html, {
      title,
      description,
      canonical,
      image,
      imageAlt: title,
      // Not 'product': og:type product wants a whole set of product:* tags to
      // go with it, and an incomplete set reads worse to a scraper than a
      // plain article does.
      ogType: 'article',
      locale,
      alternates: [
        { locale: 'ua', url: `${origin}/ua/painting/${painting.id}` },
        { locale: 'en', url: `${origin}/en/painting/${painting.id}` },
      ],
      // The app renders this too, but only after JavaScript runs. In the raw
      // HTML it is what lets a rich result show the price and availability.
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: title,
        image: painting.images?.length ? painting.images : [painting.cardImage],
        description: body || undefined,
        ...(painting.year ? { productionDate: String(painting.year) } : {}),
        offers: {
          '@type': 'Offer',
          url: canonical,
          price: Number.isFinite(price) ? price : undefined,
          priceCurrency: 'UAH',
          availability: painting.isAvailable
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        },
      },
    });

    return new Response(rendered, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': SHELL_CACHE,
      },
    });
  } catch {
    // A slow API, a malformed body, anything at all: the visitor still gets the
    // app. A bot seeing the generic card is the status quo; a bot seeing an
    // error is worse than the bug this function exists to fix.
    return next();
  }
};
