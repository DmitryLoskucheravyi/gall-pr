// Error reporting from the browser.
//
// Picked up automatically by Next — this filename is the contract, there is
// no import of it anywhere. It runs before the app does, which is the whole
// point: an error thrown during hydration is one of the ones worth catching,
// and anything initialised from inside a component would miss it.
//
// The SDK is loaded through a dynamic import behind a build-time constant,
// and that is not a style choice. NEXT_PUBLIC_SENTRY_DSN is inlined at build
// time, so with no DSN this becomes `if (undefined)` and the bundler drops
// the import along with everything it reaches. A static import instead costs
// 88 KB of JavaScript on every page of the site — measured — whether or not
// anyone is listening at the other end. A shop whose first screen is a scroll
// sequence cannot spend that on a reporter it has not been given.
//
// With a DSN set, the import resolves a moment after first paint. The gap is
// the price: an error in the first few hundred milliseconds is missed. Worth
// it against making every visitor download the reporter to catch it.
//
// There is deliberately no server half of this — no instrumentation.ts.
// Next compiles that file for every runtime including the edge one, and the
// same guard does not work there: SENTRY_DSN is a runtime value, not a
// build-time constant, so the import survives tree-shaking and lands in the
// middleware bundle. Measured, it took the middleware from 34 KB to 107 KB —
// on every request, at the edge, for an SDK the edge runtime cannot run.
//
// Little is lost. This app's server side is prerendered HTML and a locale
// redirect; the logic that can fail at runtime is in the API, which reports
// to Sentry itself (see backend/src/instrument.ts). If server-side reporting
// is ever wanted here, the way in is withSentryConfig and separate
// server/edge config files, not a second copy of this one.

type SentryModule = typeof import('@sentry/nextjs');

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

let sentry: SentryModule | null = null;

if (DSN) {
  void import('@sentry/nextjs').then((mod) => {
    sentry = mod;

    mod.init({
      dsn: DSN,
      // A shop this size will never trouble the quota with traces, and the
      // value of them is knowing which route is slow before a customer says
      // so.
      tracesSampleRate: 1,
      // Session replay is deliberately off: it records what the visitor does
      // on the page, which is a different promise from the one the privacy
      // statement makes, and it is not covered by the cookie banner's
      // categories.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      environment: process.env.NODE_ENV,
      // Noise the reporting would otherwise be made of: a browser extension
      // throwing inside its own injected script, and a navigation cancelled
      // by the reader clicking something else mid-load.
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'AbortError',
        'Non-Error promise rejection captured',
      ],
    });
  });
}

// Next calls this on every client-side navigation. It has to exist whether or
// not the SDK does, so it forwards once there is something to forward to.
export function onRouterTransitionStart(
  ...args: Parameters<SentryModule['captureRouterTransitionStart']>
) {
  sentry?.captureRouterTransitionStart(...args);
}
