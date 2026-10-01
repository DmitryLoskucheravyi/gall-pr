import type { Metadata } from 'next';

import PrivacyPage from '@/views/PrivacyPage';
import { PRIVACY } from '@/content/privacy';
import { pageMetadata } from '@/lib/metadata';
import { DEFAULT_LOCALE, isLocale } from '@/utils/locale';

// Rendered entirely on the server: the statement is static text, and a
// crawler (or a regulator) should find it in the raw HTML.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const { title, description } = PRIVACY[locale];
  const base = pageMetadata(locale, '/privacy');

  return {
    ...base,
    title,
    description,
    openGraph: { ...base.openGraph, title, description },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;

  return <PrivacyPage locale={isLocale(raw) ? raw : DEFAULT_LOCALE} />;
}
