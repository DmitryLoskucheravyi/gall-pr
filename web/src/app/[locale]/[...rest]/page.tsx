import { notFound } from 'next/navigation';

// Every address under a locale that no route claims — /ua/nope,
// /ua/painting/1/extra — lands here and is turned into a 404 inside the
// locale layout, so it gets [locale]/not-found.tsx: the header, the footer,
// the visitor's own language and <html lang> to match.
//
// Without it an unmatched address skipped the locale layout entirely and fell
// to a global not-found, which had to supply its own <html> because there is no
// app/layout.tsx. `next build` accepted that; the webpack dev server did not,
// and the first 404 in development broke the build for every open tab with
// "not-found.tsx doesn't have a root layout".
//
// Specific routes always win over a catch-all, so this only ever sees what
// would otherwise have had no page at all. No Suspense above it, so the 404
// reaches the status line — see Layout.tsx.
export default function CatchAll() {
  notFound();
}
