// Every outbound call this app makes goes to somebody else's server: Nova
// Poshta, the National Bank, Cloudinary, Telegram. `fetch` has no timeout of
// its own — a peer that accepts the connection and then says nothing holds the
// request open indefinitely, and on the checkout path that is a request worker
// parked forever behind a third party's bad afternoon.
//
// So nothing here calls fetch directly. This does, always with a deadline.
export const DEFAULT_TIMEOUT_MS = 10_000;

export class UpstreamError extends Error {
  constructor(
    readonly service: string,
    message: string,
  ) {
    super(`${service}: ${message}`);
    this.name = 'UpstreamError';
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  // AbortSignal.timeout rejects with a TimeoutError rather than hanging, and
  // unlike a hand-rolled setTimeout + controller it cannot leak the timer.
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

// The same call, with the JSON parse folded in — a peer that answers an API
// request with an HTML error page must read as "the service failed", not as an
// unhandled SyntaxError halfway up the stack.
export async function fetchJson<T>(
  service: string,
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  let response: Response;

  try {
    response = await fetchWithTimeout(url, init, timeoutMs);
  } catch (error) {
    throw new UpstreamError(
      service,
      error instanceof Error ? error.message : String(error),
    );
  }

  if (!response.ok) {
    throw new UpstreamError(service, `responded ${response.status}`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new UpstreamError(
      service,
      'responded with something that is not JSON',
    );
  }
}
