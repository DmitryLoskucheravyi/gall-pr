import type { Metadata } from 'next';

import View from '@/views/HomePage';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return pageMetadata(locale, '/');
}

export default function Page() {
  return <View />;
}
