'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import Script from 'next/script';

import { hasConsent, onConsentChange } from '../lib/consent';
import { removeStored, writeStored } from '../utils/safeStorage';

// Plausible, loaded only once the visitor has agreed to analytics.
//
// Plausible rather than GA4 for one reason that decides it: it sets no
// cookies and stores no identifier, so the cookie table in the privacy
// statement stays true and the banner keeps meaning what it says. GA4 would
// have added four cookies to a page that currently sets exactly one, and that
// one only because a session cannot work without it.
//
// It is still gated on consent. The script is anonymous, but it is a request
// to a third party made on the visitor's behalf, and lib/consent.ts was
// written for precisely this — see the note at the top of it. A visitor who
// agrees after the page has loaded is counted from that moment on, without
// having to reload: that is what the subscription below is for.
//
// Nothing renders at all unless NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set, so a
// developer running the site locally never counts themselves, and the shop
// can be deployed before anyone has decided on a counter.

const DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
// Self-hosted instances live elsewhere; the cloud one is the default. `||`
// rather than `??`: .env.example ships the variable present but empty, and an
// empty host would request the script from this site's own origin.
const HOST = (process.env.NEXT_PUBLIC_PLAUSIBLE_HOST || 'https://plausible.io').replace(
  /\/+$/,
  '',
);

// Plausible's own opt-out switch, checked before every event it sends. A
// script that has already loaded cannot be unloaded, so withdrawing consent
// mid-visit sets this instead — otherwise the counter would go on recording
// every navigation until the next full page load.
const IGNORE_KEY = 'plausible_ignore';

const subscribe = (notify: () => void) => onConsentChange(notify);
const readAllowed = () => hasConsent('analytics');
// The server has no consent to read. Hydration renders with this too, then
// re-renders with the stored answer, so the markup never disagrees.
const serverAllowed = () => false;

export default function Analytics() {
  const allowed = useSyncExternalStore(subscribe, readAllowed, serverAllowed);

  // Only ever written on a withdrawal, so a visitor who never agreed is not
  // handed a key for a script they never loaded; cleared on the next yes.
  const wasAllowed = useRef(false);
  useEffect(() => {
    if (!DOMAIN) return;
    if (allowed) removeStored(IGNORE_KEY);
    else if (wasAllowed.current) writeStored(IGNORE_KEY, 'true');
    wasAllowed.current = allowed;
  }, [allowed]);

  if (!DOMAIN || !allowed) return null;

  return (
    <Script
      // Not the hash variant. Plausible's default script already counts
      // History API navigations — which is all Next's client router does —
      // while the hash one swaps that for a hashchange listener and would
      // miss every one of them, counting only the landing page.
      src={`${HOST}/js/script.outbound-links.js`}
      data-domain={DOMAIN}
      strategy="afterInteractive"
    />
  );
}
