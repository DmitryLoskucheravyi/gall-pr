import type { Metadata } from 'next';

import View from '@/views/NotFoundPage';

// A page that says so, rather than the silent bounce to the home page the SPA
// used to do — which answered 200 for every mistyped URL and let search engines
// index the home page under a hundred addresses.
//
// Under Next this is a real 404 status, so the `noindex` the SPA had to inject
// by hand is no longer the only signal.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <View />;
}
