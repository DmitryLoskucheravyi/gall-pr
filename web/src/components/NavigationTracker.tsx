'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

import { markInAppNavigation } from '../lib/inAppHistory';

// Watches the move from one page of the site to another. Renders nothing.
//
// - Notes the first such move, so "back" buttons know there is somewhere of
//   ours to go back to (lib/inAppHistory).
// - Starts every new page at the top. Next only scrolls when the new page's
//   first element is out of view, and with the header and footer staying put
//   across a navigation that check can pass while the reader is still down
//   at the footer. Browser back/forward is left alone: there the browser
//   restores where the reader was, which is the point of going back.
//
// Telling the two apart: by the last thing that happened to the history.
// Next commits a forward navigation with history.pushState (replaceState for
// router.replace) before the new page's layout effects run; back/forward
// fires popstate. An earlier version kept a "popstate happened" flag until
// the next page change — but back/forward also happens *within* a page (the
// catalogue's ?page=2, a lightbox), the flag outlived it, and the next
// ordinary link was taken for "back" and left at the old scroll position.
//
// One scrollTo is not always enough on a real phone: a tap that lands while
// the old page is still gliding from a swipe keeps that momentum going, and
// the new page grows as its data and images arrive. So the reset is repeated
// for a short while — on a timer and whenever the page's height changes —
// until the reader touches, wheels or presses a key, when it is theirs.

type HistoryAction = 'forward' | 'back' | null;

// How long after a navigation the reset keeps re-applying itself.
const SETTLE_MS = 1500;
const RESETS = [60, 150, 300, 500, 800, 1200];

let lastAction: HistoryAction = null;
let patched = false;

// Whether a history write takes the reader to a different page. Called
// before the write, while location still shows the page being left.
function isNewPage(url: string | URL | null | undefined): URL | null {
  if (url == null) return null;
  const next = new URL(String(url), window.location.href);
  return next.pathname === window.location.pathname ? null : next;
}

function patchHistory() {
  if (patched) return;
  patched = true;
  const { pushState, replaceState } = window.history;
  // The earliest moment a forward navigation is known for certain: Next is
  // writing the new entry. Going to the top here doesn't wait on any React
  // effect; the layout effect below then makes sure it sticks. Only *after*
  // the write: the browser saves the old entry's scroll position as the new
  // one is pushed, and resetting first made "back" return to the top.
  window.history.pushState = function (...args) {
    const next = isNewPage(args[2]);
    const result = pushState.apply(this, args);
    if (next) {
      lastAction = 'forward';
      if (!next.hash) toTop();
    }
    return result;
  };
  // Next also calls replaceState to stash its own state on the current entry
  // — including right after a back/forward — so it only marks a navigation
  // (router.replace to a different page) and never scrolls by itself.
  window.history.replaceState = function (...args) {
    if (isNewPage(args[2])) lastAction = 'forward';
    return replaceState.apply(this, args);
  };
  window.addEventListener('popstate', () => {
    lastAction = 'back';
  });
}

function toTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  // Belt and braces for engines that ignore the options form mid-momentum.
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function NavigationTracker() {
  const pathname = usePathname();
  const first = useRef<string | null>(null);
  const settle = useRef<(() => void) | null>(null);

  const stopSettling = () => {
    settle.current?.();
    settle.current = null;
  };

  useEffect(() => {
    patchHistory();
    // Any input of the reader's own ends the follow-up resets.
    const onInput = () => stopSettling();
    window.addEventListener('touchstart', onInput, { passive: true });
    window.addEventListener('wheel', onInput, { passive: true });
    window.addEventListener('keydown', onInput);
    return () => {
      window.removeEventListener('touchstart', onInput);
      window.removeEventListener('wheel', onInput);
      window.removeEventListener('keydown', onInput);
      stopSettling();
    };
  }, []);

  // Layout effect: before the new page paints, so it never flashes in at the
  // old scroll position first.
  useLayoutEffect(() => {
    if (first.current === null) {
      first.current = pathname;
      return;
    }
    if (pathname !== first.current) markInAppNavigation();

    const action = lastAction;
    lastAction = null;
    if (action === 'back') return;
    // A link to an anchor on the new page scrolls there itself.
    if (window.location.hash) return;

    stopSettling();
    toTop();
    const timers = RESETS.map((ms) => setTimeout(toTop, ms));
    // The new page growing (data, images) can carry the view along with it.
    const observer = new ResizeObserver(() => toTop());
    observer.observe(document.body);
    const done = setTimeout(stopSettling, SETTLE_MS);
    settle.current = () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
