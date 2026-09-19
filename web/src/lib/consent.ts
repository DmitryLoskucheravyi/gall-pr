import { readStored, writeStored } from '../utils/safeStorage';

// The visitor's cookie decision, and the one place anything is allowed to ask
// about it.
//
// Nothing on the site reads analytics consent yet, because there is no
// analytics yet. That is the point of this module existing ahead of it: when a
// counter is finally added, it asks `hasConsent('analytics')` before it loads,
// and subscribes to onConsentChange so it can start the moment someone agrees
// without them having to reload the page. A tag that ships before this exists
// is a tag that fires on everyone by default, which is exactly what the banner
// is there to prevent.

export type ConsentCategory = 'necessary' | 'analytics';

export type Consent = {
  // Bumped when the categories change. An older record is treated as no
  // decision at all and the banner asks again, because consent given to a
  // shorter list was never consent to the longer one.
  version: number;
  analytics: boolean;
  // ISO timestamp. Consent has to be demonstrable after the fact, and "they
  // clicked something once" is not demonstrable without a date.
  decidedAt: string;
};

const STORAGE_KEY = 'gall_cookie_consent';

// Raise this when a category is added. Adding "advertising" later must not
// inherit a yes that was only ever given to analytics.
export const CONSENT_VERSION = 1;

// Fired on the window so a listener anywhere — including one mounted long
// before the decision — learns about it without prop-drilling or a store.
export const CONSENT_EVENT = 'gall:consent';

function parse(raw: string | null): Consent | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<Consent>;

    if (parsed.version !== CONSENT_VERSION) return null;
    if (typeof parsed.analytics !== 'boolean') return null;
    if (typeof parsed.decidedAt !== 'string') return null;

    return {
      version: parsed.version,
      analytics: parsed.analytics,
      decidedAt: parsed.decidedAt,
    };
  } catch {
    // Hand-edited or truncated — treat as undecided rather than guessing.
    return null;
  }
}

/** The stored decision, or null if the visitor has not made one yet. */
export function readConsent(): Consent | null {
  return parse(readStored(STORAGE_KEY));
}

/**
 * Whether a category may be used right now.
 *
 * `necessary` is always true: it covers the session cookie, the guest cart
 * token and the interface settings the visitor themselves chose, none of which
 * the site can drop without ceasing to work. Everything else defaults to false
 * until there is a recorded yes — no decision means no.
 */
export function hasConsent(category: ConsentCategory): boolean {
  if (category === 'necessary') return true;

  return readConsent()?.analytics === true;
}

/** Records the decision and tells the page about it. */
export function writeConsent(analytics: boolean): Consent {
  const consent: Consent = {
    version: CONSENT_VERSION,
    analytics,
    decidedAt: new Date().toISOString(),
  };

  writeStored(STORAGE_KEY, JSON.stringify(consent));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }));
  }

  return consent;
}

/**
 * Subscribes to decisions. Returns the unsubscribe function.
 *
 * Storage is not shared between tabs here on purpose — the `storage` event
 * would carry a decision made in another tab, but acting on it would mean
 * loading a tracker into a page whose visitor never saw the banner in this
 * tab. They will get it on their next navigation, which is soon enough.
 */
export function onConsentChange(listener: (consent: Consent) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => listener((event as CustomEvent<Consent>).detail);

  window.addEventListener(CONSENT_EVENT, handler);

  return () => window.removeEventListener(CONSENT_EVENT, handler);
}
