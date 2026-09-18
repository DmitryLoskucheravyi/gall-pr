import type { Metadata } from 'next';

import { Suspense } from 'react';

import View from '@/views/AuthPage';

// Behind a login, or with nothing to rank for. robots.txt disallows
// these too; this is the half a crawler that ignores robots.txt sees.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  // ResetPasswordForm reads the token from the query string during render, and
  // useSearchParams needs a boundary above it. Everything here is behind a
  // one-time link and noindex, so nothing is lost by rendering it on the
  // client.
  return (
    <Suspense fallback={null}>
      <View />
    </Suspense>
  );
}
