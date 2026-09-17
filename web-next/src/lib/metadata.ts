import type { Metadata } from 'next';

import ua_catalog from '../locales/ua/catalog.json';
import en_catalog from '../locales/en/catalog.json';
import ua_gallery from '../locales/ua/gallery.json';
import en_gallery from '../locales/en/gallery.json';
import ua_faq from '../locales/ua/faq.json';
import en_faq from '../locales/en/faq.json';
import ua_home from '../locales/ua/home.json';
import en_home from '../locales/en/home.json';

import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from '../utils/locale';

// Server-side metadata.
//
// A Server Component has no react-i18next — that is a React context and lives
// on the client — so the same JSON the views read through `t()` is imported
// directly here. Two readers of one source, which is the point: the title a
// crawler sees and the title a visitor sees come from the same string.
const DICTS: Record<string, Record<Locale, Record<string, unknown>>> = {
  catalog: { ua: ua_catalog, en: en_catalog },
  gallery: { ua: ua_gallery, en: en_gallery },
  faq: { ua: ua_faq, en: en_faq },
  home: { ua: ua_home, en: en_home },
};

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://viktorumm.com'
).replace(/\/$/, '');

function lookup(
  namespace: string,
  locale: Locale,
  key: string,
): string | undefined {
  const value = DICTS[namespace]?.[locale]?.[key];

  return typeof value === 'string' ? value : undefined;
}

// Both languages of a page, each pointing at the other. Reciprocal, because
// search engines only act on hreflang when both sides agree — two locales on
// separate paths with nothing joining them is how a page competes with its own
// translation.
export function alternatesFor(path: string) {
  const languages: Record<string, string> = {};

  for (const locale of LOCALES) {
    languages[locale === 'ua' ? 'uk' : 'en'] = `${SITE_URL}/${locale}${path === '/' ? '' : path}`;
  }

  // x-default points at Ukrainian: this is a Ukrainian gallery, and that is the
  // sensible landing for an unmatched language.
  languages['x-default'] = `${SITE_URL}/ua${path === '/' ? '' : path}`;

  return languages;
}

export function canonicalFor(locale: string, path: string): string {
  const safe = isLocale(locale) ? locale : DEFAULT_LOCALE;

  return `${SITE_URL}/${safe}${path === '/' ? '' : path}`;
}

type Options = {
  namespace?: string;
  titleKey?: string;
  descriptionKey?: string;
};

export function pageMetadata(
  rawLocale: string,
  path: string,
  options: Options = {},
): Metadata {
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const { namespace, titleKey, descriptionKey } = options;

  const title =
    namespace && titleKey ? lookup(namespace, locale, titleKey) : undefined;
  const description =
    namespace && descriptionKey
      ? lookup(namespace, locale, descriptionKey)
      : undefined;

  const canonical = canonicalFor(locale, path);

  return {
    // Undefined falls back to the template in the root layout rather than
    // rendering the word "undefined".
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical, languages: alternatesFor(path) },
    openGraph: {
      type: 'website',
      url: canonical,
      locale: locale === 'en' ? 'en_US' : 'uk_UA',
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    },
  };
}
