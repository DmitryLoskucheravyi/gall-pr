'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

import { isBusy, subscribeBusy } from '../../lib/busy';
import styles from './LoadingCursor.module.scss';

// The site's own "working on it" cursor: while anything is loading, a small
// ring of ink rides beside the pointer, drawing itself round and round in the
// same hand as the arrows and the branches.
//
// Beside the pointer, not instead of it. A CSS cursor image cannot animate,
// and replacing the pointer with a DOM element would make every click land
// one frame late; so the system arrow stays where it is and this follows it,
// offset the way the operating system's own "busy" companion sits.
//
// What counts as loading:
//   * a query with no data yet — a first load, not a background refresh,
//     which would otherwise make the cursor twitch every few minutes;
//   * any mutation (saving, deleting, uploading);
//   * a navigation: from the click on an internal link until the URL has
//     changed, and for as long as a route's loading.tsx is on screen;
//   * anything else that calls startBusy() from lib/busy.ts.
//
// Shown only after a short delay, and then for a short minimum, so a fast
// response never flickers it. Nothing at all on a device without a hovering
// pointer — there is no cursor there to accompany.

const SHOW_AFTER_MS = 160;
const SHOW_AT_LEAST_MS = 420;
// A navigation that never completes (a link to a page that throws, say) must
// not leave the cursor spinning for the rest of the visit.
const NAVIGATION_TIMEOUT_MS = 12000;

export default function LoadingCursor() {
  const firstLoads = useIsFetching({
    predicate: (query) => query.state.status === 'pending',
  });
  const mutations = useIsMutating();
  const external = useSyncExternalStore(subscribeBusy, isBusy, () => false);
  const navigating = useNavigationBusy();

  const busy = firstLoads > 0 || mutations > 0 || external || navigating;
  const visible = useDebouncedVisibility(busy);
  const pointer = useHoverPointer();

  const ref = useRef<HTMLDivElement>(null);

  // Follows the pointer by writing a transform directly: React state per
  // mousemove would re-render on every pixel.
  useEffect(() => {
    if (!pointer) return;
    const el = ref.current;
    if (!el) return;

    const onMove = (event: PointerEvent) => {
      el.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      el.dataset.placed = 'true';
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [pointer]);

  if (!pointer) return null;

  return (
    <div
      ref={ref}
      className={styles.cursor}
      data-visible={visible || undefined}
      aria-hidden="true"
    >
      <svg className={styles.ring} viewBox="0 0 32 32">
        {/* Not a perfect circle: a hand closing a loop, overshooting a
            little where it meets itself. */}
        <path
          className={styles.loop}
          pathLength={1}
          d="M16 4.2c6.9-.3 12 5 11.8 11.6-.2 6.6-5.4 11.9-12 11.8C9.3 27.5 4.2 22.4 4.3 15.9 4.4 9.6 9.2 4.6 15.3 4.3"
        />
        <circle className={styles.dot} cx="16" cy="4.3" r="1.25" />
      </svg>
    </div>
  );
}

// True from a click on an internal link until the URL it leads to arrives.
function useNavigationBusy(): boolean {
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const here = window.location.pathname + window.location.search;
      const there = url.pathname + url.search;
      // A hash link on the same page is not a navigation.
      if (there === here) return;

      setPending(there);
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Arrived — wherever it was going, the URL has moved on.
  const current = pathname + (search.size ? `?${search.toString()}` : '');
  const [lastSeen, setLastSeen] = useState(current);
  if (current !== lastSeen) {
    setLastSeen(current);
    if (pending !== null) setPending(null);
  }

  useEffect(() => {
    if (pending === null) return;
    const timer = window.setTimeout(() => setPending(null), NAVIGATION_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);

  return pending !== null;
}

// Late to appear and slow to leave, so a quick answer shows nothing and a
// slow one does not blink off and on between its steps.
function useDebouncedVisibility(busy: boolean): boolean {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (busy) {
      const timer = window.setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, SHOW_AFTER_MS);
      return () => window.clearTimeout(timer);
    }

    const left = SHOW_AT_LEAST_MS - (Date.now() - shownAt.current);
    const timer = window.setTimeout(() => setVisible(false), Math.max(0, left));
    return () => window.clearTimeout(timer);
  }, [busy]);

  return visible;
}

const hoverQuery = '(hover: hover) and (pointer: fine)';

function useHoverPointer(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(hoverQuery);
      media.addEventListener('change', notify);
      return () => media.removeEventListener('change', notify);
    },
    () => window.matchMedia(hoverQuery).matches,
    () => false,
  );
}
