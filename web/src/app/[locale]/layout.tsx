import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import '@/styles/global.scss';

import Providers from '../providers';
import Analytics from '@/components/Analytics';
import Layout from '@/components/layout/Layout';
import { LOCALES, isLocale, type Locale } from '@/utils/locale';
import { serverFetchOrNull } from '@/lib/api-server';
import type { PublicAppSettings } from '@/types/settings.types';

// This is the root layout: every route on the site carries a locale, so there
// is nothing above it to own <html> and <body>. That is the documented shape
// for an App Router app whose first segment is the language — a layout one
// level up could only hard-code a `lang`, which would be wrong for half the
// site.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://viktorumm.com';

// Rendered at build time for both languages rather than on demand.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// viewport-fit=cover is what makes iOS report its safe areas at all: without
// it env(safe-area-inset-bottom) is 0, the bottom bar cannot pad itself over
// the home indicator, and the page shows through the strip beneath it.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // The mobile browser's own bar, matched to the page behind it so the
  // screen reads as one surface — global.scss's --color-background per theme.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eee9e4' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1a17' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Viktorumm — галерея сучасного українського живопису',
    // Every page that sets a title gets the gallery's name after it, so no
    // page has to remember to append it.
    template: '%s · Viktorumm',
  },
  description:
    'Кураторська добірка оригінальних картин від українських художників. Кожна робота — в єдиному екземплярі. Доставка Новою поштою по всій Україні.',
  openGraph: {
    type: 'website',
    siteName: 'Viktorumm',
    images: [{ url: '/og-cover.jpg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
  // The figure from the logo, cream on the shop's burgundy. Generated from
  // design/logo/ along with the rest of public/brand/. The .ico is what tabs,
  // bookmarks and anything still asking for /favicon.ico get; the PNG is the
  // sharper choice where a browser takes one; apple-touch-icon is the
  // home-screen icon on iOS, which doesn't read the manifest.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/brand/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: { url: '/brand/apple-touch-icon.png', sizes: '180x180' },
  },
  manifest: '/manifest.webmanifest',
  // Google Search Console's ownership check. Next renders the meta tag only
  // when the token is set, so nothing appears until the property is actually
  // claimed — and the token itself stays out of the repository.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // The middleware rewrites an unknown first segment, so reaching here with a
  // bad one means something went around it — a 404 rather than a silent
  // fallback to Ukrainian, which would let /de/catalog answer 200 forever.
  if (!isLocale(locale)) notFound();

  // The site settings every page reads — the author's name, the Telegram
  // link, the footer's contacts. Fetched once here and put into the query
  // cache before anything renders, on the server and in the browser alike.
  // Left to each component's own query, the header, the footer and the page
  // filled it at different moments in the two passes, and whatever depended on
  // it (the footer's bot link, the author line) failed hydration.
  const settings = await serverFetchOrNull<PublicAppSettings>('/settings', {
    revalidate: 3600,
    tags: ['settings'],
  });

  return (
    <html lang={locale === 'en' ? 'en' : 'uk'} suppressHydrationWarning>
      <head>
        {/* Runs before first paint so a dark-theme visitor never sees a white
            flash. Inline for that reason and no other. Every storage access is
            guarded: reading window.localStorage throws outright in a private
            window or with site data blocked, and an uncaught throw here runs
            before anything else on the page.

            suppressHydrationWarning on <html> above is because of this: the
            script adds a class the server never rendered. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=null;try{s=localStorage.getItem('gall_theme')}catch(e){}var d=s?s==='dark':window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')})()`,
          }}
        />
      </head>
      <body>
        <Providers locale={locale as Locale} settings={settings}>
          <Layout>{children}</Layout>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
