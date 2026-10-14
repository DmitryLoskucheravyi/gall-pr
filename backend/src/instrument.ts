import * as Sentry from '@sentry/nestjs';

// Sentry, and the one thing about it that cannot be got wrong: this file has
// to be imported before anything else in main.ts.
//
// @sentry/nestjs works by instrumenting the libraries it finds — Express,
// TypeORM, the HTTP client — at the moment they are first required. Import it
// after AppModule and those are already loaded unwrapped, so the SDK starts
// cleanly and then reports nothing but the errors it is handed by hand. Hence
// a file of its own, imported first, rather than two lines inside bootstrap().
//
// Without SENTRY_DSN nothing initialises at all. The shop has run without
// error reporting until now and must keep running without it, in development
// and on a deployment that has not been given a project.

// The .env file has not been read yet. ConfigModule does that, but only once
// AppModule is built — long after this line has decided whether to start.
// Without loading it here, a DSN set in .env (rather than in the container's
// environment) would never switch Sentry on. Variables already in the
// environment win, exactly as they do under ConfigModule; a missing file is
// not an error.
try {
  process.loadEnvFile();
} catch {
  // No .env — the environment is all there is.
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    // Every request traced. The API serves a gallery, not a feed — the volume
    // is low enough that sampling would only make the slow ones harder to
    // find.
    tracesSampleRate: 1,
    // No sendDefaultPii here on purpose: the SDK leaves it off unless asked,
    // and the refresh cookie and the Authorization header are the two things
    // on this API worth stealing. An error report is not a place for either.
  });
}
