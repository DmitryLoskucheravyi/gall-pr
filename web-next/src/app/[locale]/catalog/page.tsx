import type { Metadata } from 'next';

import View from '@/views/CatalogPage';
import { pageMetadata } from '@/lib/metadata';

// The metadata is produced on the server so a crawler sees it in the
// raw HTML. The view below is unchanged and still client-rendered.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return pageMetadata(locale, '/catalog', {
    namespace: 'catalog',
    titleKey: 'pageTitle',
    descriptionKey: 'pageDescription',
  });
}

export default function Page() {
  return <View />;
}
