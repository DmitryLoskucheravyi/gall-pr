import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { stripLocale } from '../utils/locale';
import { useLocale } from './useLocale';

const SITE_NAME = 'Viktorumm';
const DEFAULT_TITLE = 'Viktorumm — галерея сучасного українського живопису';
const LOCALES = ['ua', 'en'] as const;

// Sets the title, description, canonical, Open Graph tags and hreflang per
// route.
//
// Two audiences, and they see different things:
//
//  - Googlebot runs JavaScript, so it eventually picks these up. That is what
//    this hook is for, and why it now writes og:* and canonical rather than
//    only the title — previously every page in the app shared one og:image and
//    one canonical, which is how a site competes with itself.
//
//  - The preview bots of Telegram, Instagram, Facebook and X run no JavaScript
//    at all and never see any of this. They are served pre-rendered tags by the
//    Cloudflare Pages Functions in web/functions instead. The two must agree:
//    a link's preview and the page it opens saying different things is worse
//    than either being wrong alone.
type PageMeta = {
  title?: string;
  description?: string;
  /** Absolute URL of an image for the social card. */
  image?: string | null;
  ogType?: 'website' | 'article';
};

function setMetaContent(
  attr: 'name' | 'property',
  key: string,
  value: string,
): string | null {
  const element = document.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );

  if (!element) return null;

  const previous = element.getAttribute('content');
  element.setAttribute('content', value);

  return previous;
}

function setLink(rel: string, href: string, hreflang?: string): HTMLLinkElement {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;

  let element = document.querySelector<HTMLLinkElement>(selector);

  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    if (hreflang) element.hreflang = hreflang;
    document.head.appendChild(element);
  }

  element.href = href;

  return element;
}

export function usePageMeta(
  title?: string,
  description?: string,
  options: Pick<PageMeta, 'image' | 'ogType'> = {},
) {
  const { pathname } = useLocation();
  const locale = useLocale();
  const { image, ogType = 'website' } = options;

  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;
    const path = stripLocale(pathname);
    const canonical = `${window.location.origin}/${locale}${path}`;

    document.title = fullTitle;

    // Every write records what it replaced, so leaving the page restores the
    // document rather than leaving one route's description on the next.
    const restore: Array<() => void> = [];

    const write = (
      attr: 'name' | 'property',
      key: string,
      value: string | undefined,
    ) => {
      if (!value) return;

      const previous = setMetaContent(attr, key, value);
      if (previous !== null) {
        restore.push(() => setMetaContent(attr, key, previous));
      }
    };

    write('name', 'description', description);
    write('property', 'og:title', fullTitle);
    write('property', 'og:description', description);
    write('property', 'og:url', canonical);
    write('property', 'og:type', ogType);
    write('property', 'og:locale', locale === 'en' ? 'en_US' : 'uk_UA');
    write('name', 'twitter:title', fullTitle);
    write('name', 'twitter:description', description);

    if (image) {
      write('property', 'og:image', image);
      write('name', 'twitter:image', image);
    }

    setLink('canonical', canonical);

    // The same page in the other language. Reciprocal, because search engines
    // only act on hreflang when both sides point at each other.
    for (const alt of LOCALES) {
      setLink(
        'alternate',
        `${window.location.origin}/${alt}${path}`,
        alt === 'ua' ? 'uk' : 'en',
      );
    }
    setLink('alternate', `${window.location.origin}/ua${path}`, 'x-default');

    return () => {
      document.title = DEFAULT_TITLE;
      for (const undo of restore) undo();
    };
  }, [title, description, image, ogType, pathname, locale]);
}
