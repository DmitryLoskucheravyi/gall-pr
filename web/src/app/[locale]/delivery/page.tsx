import type { Metadata } from 'next';

import LegalPage from '@/views/LegalPage';
import { DELIVERY, DELIVERY_UPDATED } from '@/content/delivery';
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
  const { title, description } = DELIVERY[locale];
  const base = pageMetadata(locale, '/delivery');

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
      document={DELIVERY}
      locale={isLocale(raw) ? raw : DEFAULT_LOCALE}
      updatedAt={DELIVERY_UPDATED}
    />
  );
}
