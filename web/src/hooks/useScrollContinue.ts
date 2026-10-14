'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useLocale } from './useLocale';
import { stripLocale } from '../utils/locale';

// A handful of pages read as one continuous walk rather than separate
// destinations: the homepage closes into the catalog, and the catalog opens
// onto the full gallery. Scrolling past the very bottom of
// one — past the footer, past everything — carries the reader on to the
// next rather than just stopping. Not a site-wide thing: most pages have
// nowhere further to go, and stay silent here.
//
// Keyed by the locale-stripped path and returned unprefixed — Footer and
// ContinuePrompt render it through LocalizedLink, which adds the current
// locale itself; only this hook's own internal navigate() call (the
// auto-complete case, below) needs the prefix spelled out by hand.
const NEXT_PATH: Record<string, string> = {
  '/': '/catalog',
  '/catalog': '/gallery',
};

// Slack before "the page can't scroll any further" counts as the bottom —
// sub-pixel layout rounding can leave a fraction of a pixel of room that
// never actually scrolls.
const BOTTOM_SLACK = 4;
// Continued wheel input needed to fill the bar, in the same px units
// wheel events report. Deliberately more than a screen's worth of ordinary
// scrolling — this only fires on scroll that keeps going once there is
// nothing left to scroll, and it should read as a deliberate push, not
// something a reader falls into on their way to the "Нагору" button.
const WHEEL_UNIT = 900;
// The scroll that brought the reader to the bottom never fills the bar —
// however hard it was flicked, and however long a free-spinning wheel or
// the OS's momentum keeps dispatching events after it. The bar only arms
// once the wheel has gone quiet for this long while resting at the bottom;
// the next turn after that pause is the deliberate push. Without it a
// free-spinning wheel would carry the reader from page to page to page.
const WHEEL_QUIET_MS = 350;
// However much delta a burst reports, the bar can only climb this fast in
// real time — a fast flick and a slow one that add up to the same total
// fill the bar at the same rate. This is what actually stops a burst (or
// its momentum tail, once past the grace window above) from completing the
// bar in one motion: filling it for real takes this long no matter what.
const MIN_FILL_MS = 900;
// A touch gesture doesn't get the same luxury: there's no "keep spinning
// the wheel," just however far a thumb can drag before it runs out of
// screen. Px of drag past the bottom that fill the bar — roughly a third of
// a phone screen, a deliberate pull rather than a stray nudge. The page
// only turns once the finger lifts with the bar full (see onTouchEnd).
const TOUCH_UNIT = 220;
// On a phone the bottom is a moving target — Safari's toolbar grows and
// shrinks the viewport as the page scrolls, so the last few dozen px may
// never quite be reached. A touch counts as "at the bottom" this close.
const TOUCH_SLACK = 64;
// No further input for this long and the bar eases back to empty, the way
// a pull-to-refresh snaps back when it's let go before finishing.
const IDLE_DECAY_MS = 600;
// Eases gently rather than snapping to each notch — close to
// useHeroSequence's own pace, tuned for a much shorter distance.
const EASE = 0.09;
const SETTLED = 0.001;
// How long the handover veil takes to cover the screen before the route
// actually changes underneath it.
const VEIL_MS = 320;

export function useScrollContinue() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const nextPath = NEXT_PATH[stripLocale(pathname)];

  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  // Touch only: the bar is full but the finger is still down — the prompt
  // says "release" and nothing happens until it does.
  const [ready, setReady] = useState(false);

  // The bar's own clock: a target the input handlers set and a value eased
  // toward it, the same split useHeroSequence uses and for the same reason
  // — a wheel arrives in ~100px notches, and reading that raw would make
  // the bar jump rather than fill.
  const target = useRef(0);
  const value = useRef(0);
  const frame = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // The veil's own timer. Held so unmounting mid-handover doesn't navigate a
  // router that is on its way out — and so a locale change, which re-runs the
  // effect below, can't leave an orphaned navigate() aimed at the old one.
  const veilTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const touchY = useRef<number | null>(null);
  const arrived = useRef(false);
  // Wheel-only: whether a pause at the bottom has armed the bar (see
  // WHEEL_QUIET_MS), when the last wheel event of any kind arrived, and the
  // last moment the bar actually grew — see addTo's `limited` path.
  const wheelArmed = useRef(false);
  const lastWheelAt = useRef<number | null>(null);
  const lastGrowAt = useRef<number | null>(null);

  // A fresh page is a fresh bar. Footer never unmounts across a client-side
  // navigation, so without this a completed bar would carry its full value
  // onto the page it just opened and fire again on the next scroll tick.
  useEffect(() => {
    clearTimeout(veilTimer.current);
    target.current = 0;
    value.current = 0;
    arrived.current = false;
    wheelArmed.current = false;
    lastGrowAt.current = null;
    setProgress(0);
    setLeaving(false);
    setReady(false);
  }, [pathname]);

  useEffect(() => {
    if (!nextPath) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    // Which input moved last decides how close "the bottom" has to be, and
    // whether a full bar may turn the page yet: with a finger still down it
    // waits for the release.
    let touching = false;
    let fingerDown = false;
    const atBottom = () =>
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - (touching ? TOUCH_SLACK : BOTTOM_SLACK);

    const wake = () => {
      if (!frame.current) frame.current = requestAnimationFrame(step);
    };

    const armIdleDecay = () => {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        target.current = 0;
        wake();
      }, IDLE_DECAY_MS);
    };

    function step() {
      frame.current = 0;
      const drift = target.current - value.current;
      // Once the gesture is complete the rest is a formality: close it out
      // quickly rather than at the gentle pace that tracks a live push.
      const ease = target.current >= 1 ? 0.25 : EASE;
      value.current =
        Math.abs(drift) > SETTLED
          ? value.current + drift * ease
          : target.current;
      setProgress(value.current);

      if (value.current >= 0.999 && fingerDown) {
        setReady(true);
        return;
      }
      if (value.current >= 0.999 && !arrived.current) {
        arrived.current = true;
        const target = `/${locale}${nextPath}`;
        if (reduced) {
          router.push(target);
        } else {
          setLeaving(true);
          veilTimer.current = setTimeout(() => router.push(target), VEIL_MS);
        }
        return;
      }

      if (Math.abs(target.current - value.current) > SETTLED) {
        frame.current = requestAnimationFrame(step);
      }
    }

    // Shared by wheel and touch: only counts while resting against the very
    // bottom of the page, so an ordinary scroll anywhere else never touches
    // the bar, and stepping away from the bottom lets it straight back down.
    // `limited` is the wheel-only guard against a hard flick's own momentum
    // — see onWheel — and is a no-op for touch, which never had this problem.
    const addTo = (delta: number, limited = false) => {
      if (arrived.current) return;
      if (!atBottom()) {
        wheelArmed.current = false;
        lastGrowAt.current = null;
        if (target.current !== 0) {
          target.current = 0;
          wake();
        }
        return;
      }
      // Scrolling back up at the bottom retreats the bar; it never goes
      // negative first, so lifting off the bottom edge briefly doesn't
      // demand a whole bar's worth of scroll-up to cancel.
      if (delta <= 0 && target.current === 0) return;

      if (limited && delta > 0) {
        const now = performance.now();
        // Still the same burst that brought the page down here — a flick's
        // momentum or a free-spinning wheel. Wait for it to stop.
        if (!wheelArmed.current) return;

        // Past the grace window, the bar still can't fill any faster than
        // real, sustained scrolling could — whatever a single event's delta
        // claims, growth this tick is capped to what MIN_FILL_MS of steady
        // input would produce. A burst (or momentum decaying out from the
        // flick above) can't complete the bar in one motion; it has to keep
        // coming for that long.
        const elapsed =
          lastGrowAt.current === null ? 0 : now - lastGrowAt.current;
        lastGrowAt.current = now;
        const maxStep = elapsed / MIN_FILL_MS;
        const step = Math.min(delta / WHEEL_UNIT, Math.max(maxStep, 0));
        target.current = Math.min(1, target.current + step);
        armIdleDecay();
        wake();
        return;
      }

      target.current = Math.min(
        1,
        Math.max(0, target.current + delta / WHEEL_UNIT),
      );
      // A completed gesture is a decision: let the bar finish easing up and
      // turn the page even after the finger lifts, instead of decaying back
      // before it gets there.
      // While the finger is down nothing decays: holding still at a full
      // bar is the reader deciding, not abandoning. onTouchEnd settles it.
      if (target.current < 1) setReady(false);
      if (target.current >= 1 || fingerDown) clearTimeout(idleTimer.current);
      else armIdleDecay();
      wake();
    };

    const onWheel = (event: WheelEvent) => {
      touching = false;
      const now = performance.now();
      const gap =
        lastWheelAt.current === null ? Infinity : now - lastWheelAt.current;
      lastWheelAt.current = now;
      // Arms only on a wheel event that follows a real pause while already
      // resting at the bottom; the burst that got here never counts.
      if (!wheelArmed.current && atBottom() && gap >= WHEEL_QUIET_MS) {
        wheelArmed.current = true;
        lastGrowAt.current = null;
      }
      addTo(event.deltaY, true);
    };

    const onTouchStart = (event: TouchEvent) => {
      touching = true;
      fingerDown = true;
      clearTimeout(idleTimer.current);
      touchY.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (touchY.current == null || y == null) return;
      // Positive: the finger moved up, the gesture for scrolling on down.
      // addTo divides whatever it's handed by WHEEL_UNIT, so a raw touch
      // delta has to be rescaled up to wheel terms first — otherwise it
      // gets divided by WHEEL_UNIT twice over, once here and once there,
      // and TOUCH_UNIT stops meaning "this many px of drag fills the bar"
      // at all. (It was inverted before: over 900px of drag to fill a bar
      // meant to take 340 — this is that bug, not a tuning number.)
      const delta = (touchY.current - y) * (WHEEL_UNIT / TOUCH_UNIT);
      touchY.current = y;
      addTo(delta);
    };

    // The release is the commit: a full bar turns the page, anything less
    // eases back to empty.
    const onTouchEnd = () => {
      touchY.current = null;
      if (!fingerDown) return;
      fingerDown = false;
      setReady(false);
      if (target.current < 1) target.current = 0;
      wake();
    };

    // Leaving the bottom by any other means — keyboard paging, a scrollbar
    // drag — should let the bar go too.
    const onScroll = () => {
      if (!atBottom()) {
        wheelArmed.current = false;
        lastGrowAt.current = null;
        if (target.current !== 0) {
          target.current = 0;
          wake();
        }
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('scroll', onScroll);
      clearTimeout(idleTimer.current);
      clearTimeout(veilTimer.current);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [nextPath, router, locale]);

  return { nextPath, progress, leaving, ready };
}
