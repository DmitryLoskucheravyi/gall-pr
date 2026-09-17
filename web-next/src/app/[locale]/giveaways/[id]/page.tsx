import type { Metadata } from 'next';

import View from '@/views/GiveawayDetailPage';
import { alternatesFor, canonicalFor } from '@/lib/metadata';

// Deadlines move and participant counts change, so this is rendered per request
// rather than cached — but it is still server-rendered, which is what a crawler
// needs.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const path = `/giveaways/${id}`;

  return {
    alternates: {
      canonical: canonicalFor(locale, path),
      languages: alternatesFor(path),
    },
  };
}

export default function Page() {
  return <View />;
}
