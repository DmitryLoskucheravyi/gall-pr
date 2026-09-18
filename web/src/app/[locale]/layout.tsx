import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import '@/styles/global.scss';

import Providers from '../providers';
import Layout from '@/components/layout/Layout';
import { LOCALES, isLocale, type Locale } from '@/utils/locale';

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
        <Providers locale={locale as Locale}>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
