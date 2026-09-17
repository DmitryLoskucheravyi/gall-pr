// The slice of the Cloudflare Pages Functions runtime these functions use.
//
// Declared here rather than pulled in from @cloudflare/workers-types: the
// functions deliberately stick to Request, Response, URL and fetch — all of
// which the DOM lib already types — so this is the only Cloudflare-shaped
// surface left, and a whole runtime type package for it would be a dependency
// that has to be kept in step with the platform for no gain.

/** Environment bound to the Pages project. Set in the Pages dashboard. */
export type PagesEnv = {
  /** The API's public origin, e.g. https://api.viktorumm.com */
  API_URL?: string;
  /** Cloudflare's binding for the project's own static assets. */
  ASSETS: { fetch(input: Request | string): Promise<Response> };
};

export type PagesContext<Params extends string = string> = {
  request: Request;
  env: PagesEnv;
  params: Record<Params, string | string[]>;
  /** Falls through to the static asset (and so to the SPA fallback). */
  next(): Promise<Response>;
  waitUntil(promise: Promise<unknown>): void;
};

export type PagesFunction<Params extends string = string> = (
  context: PagesContext<Params>,
) => Response | Promise<Response>;
