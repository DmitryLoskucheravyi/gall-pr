'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

import { markInAppNavigation } from '../lib/inAppHistory';

// When the follow-up resets run, in ms after the navigation.
const RESETS = [0, 60, 150, 300, 500, 700];

function toTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  // Belt and braces for engines that ignore the options form mid-momentum.
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

// Watches the move from one page of the site to another. Renders nothing.
//
// - Notes the first such move, so "back" buttons know there is somewhere of
//   ours to go back to (lib/inAppHistory).
// - Starts every new page at the top. Next only scrolls when the new page's
//   first element is out of view, and with the header and footer staying put
//   across a navigation that check can pass while the reader is still down
//   at the footer — a link from the home page's footer to the cart landed on
//   the cart's footer. Browser back/forward is left alone: there the browser
//   restores where the reader was, which is the point of going back.
//
// One scrollTo is not always enough on a real iPhone: a tap that lands while
// the old page is still gliding from a swipe keeps that momentum going over
// the reset, and images streaming into the new page can shift it again. So
// the reset is repeated for a short while after the navigation — until the
// reader touches, wheels or presses a key, at which point it is theirs.
export default function NavigationTracker() {
  const pathname = usePathname();
  const first = useRef<string | null>(null);
  const viaHistory = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const cancelResets = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    const onPopState = () => {
      viaHistory.current = true;
    };
    // Any input of the reader's own ends the follow-up resets.
    const onInput = () => cancelResets();
    window.addEventListener('popstate', onPopState);
    window.addEventListener('touchstart', onInput, { passive: true });
    window.addEventListener('wheel', onInput, { passive: true });
    window.addEventListener('keydown', onInput);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('touchstart', onInput);
      window.removeEventListener('wheel', onInput);
      window.removeEventListener('keydown', onInput);
      cancelResets();
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

    if (viaHistory.current) {
      viaHistory.current = false;
      return;
    }
    // A link to an anchor on the new page scrolls there itself.
    if (window.location.hash) return;
    cancelResets();
    toTop();
    timers.current = RESETS.slice(1).map((ms) => setTimeout(toTop, ms));
  }, [pathname]);

  return null;
}
