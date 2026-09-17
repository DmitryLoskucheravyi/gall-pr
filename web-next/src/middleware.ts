import { NextResponse, type NextRequest } from 'next/server';

import { DEFAULT_LOCALE, LOCALES } from './utils/locale';

// Everything on the site lives under /ua or /en. This is what LocaleLayout used
// to do with a <Navigate> during render — doing it here means a bare path is a
// real redirect with a real status code, which a crawler understands and a
// client-side bounce never was.
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocale) return NextResponse.next();

  // 307 rather than 308: which language a bare path belongs to is a decision
  // that may change (browser-language detection, a country redirect), and a
  // permanent redirect is cached by browsers essentially forever.
  return NextResponse.redirect(
    new URL(`/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}${search}`, request.url),
  );
}

export const config = {
  // Everything except Next's own assets, the API-less static files and the two
  // SEO routes, which must answer at their canonical paths without a locale.
  // `matcher` is a string that Next compiles into a RegExp, so a literal dot
  // needs the backslash doubled: a single one is eaten by the string literal
  // and never reaches the pattern.
  matcher: [
    '/((?!_next/static|_next/image|favicon[.]svg|og-cover[.]jpg|robots[.]txt|sitemap[.]xml|.*[.](?:mp4|jpg|jpeg|png|webp|svg|ico|txt|xml|woff2?)$).*)',
  ],
};
