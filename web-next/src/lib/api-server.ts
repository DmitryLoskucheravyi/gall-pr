import 'server-only';

// The server's own way of reaching the API.
//
// Deliberately not api/client.ts: that one imports the Redux store to read the
// access token and to dispatch toasts, neither of which exists on the server —
// importing it into a Server Component would pull the whole client store into
// the server bundle.
//
// Nothing here authenticates. Everything a Server Component renders is public
// by definition: the catalogue, a painting, the settings projection. Anything
// belonging to one visitor stays on the client, where the token is.
const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type FetchOptions = {
  /** Seconds before Next revalidates its cache of this response. */
  revalidate?: number;
  /** Cache tags, so a webhook can invalidate exactly this data later. */
  tags?: string[];
};

export async function serverFetch<T>(
  path: string,
  { revalidate = 300, tags }: FetchOptions = {},
): Promise<T> {
  if (!API_URL) {
    throw new ApiError(500, 'API_URL is not configured');
  }

  const response = await fetch(`${API_URL.replace(/\/$/, '')}${path}`, {
    headers: { accept: 'application/json' },
    next: { revalidate, tags },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} responded ${response.status}`);
  }

  return (await response.json()) as T;
}

// The same call, but a failure is an absence rather than an exception — for
// the places where a missing painting should render the app's own "not found"
// instead of an error page.
export async function serverFetchOrNull<T>(
  path: string,
  options?: FetchOptions,
): Promise<T | null> {
  try {
    return await serverFetch<T>(path, options);
  } catch {
    return null;
  }
}
