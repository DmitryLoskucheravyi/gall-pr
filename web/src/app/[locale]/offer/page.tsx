import type { Metadata } from 'next';

import LegalPage from '@/views/LegalPage';
import { OFFER, OFFER_UPDATED } from '@/content/offer';
import { pageMetadata } from '@/lib/metadata';
import { DEFAULT_LOCALE, isLocale } from '@/utils/locale';

// Rendered entirely on the server: the text is static, and a crawler — or an
// acquirer checking the shop has one — should find it in the raw HTML.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const { title, description } = OFFER[locale];
  const base = pageMetadata(locale, '/offer');

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

  return (
    <LegalPage
      document={OFFER}
      locale={isLocale(raw) ? raw : DEFAULT_LOCALE}
      updatedAt={OFFER_UPDATED}
    />
  );
}
