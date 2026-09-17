import { useEffect } from 'react';
import type { RefObject } from 'react';

// Crossfades between two video elements, each permanently holding its own
// clip — start, then end, then start again — rather than reusing one
// element and reassigning its `src`.
//
// Two things were tried and dropped before this:
//   - scrubbing a single clip's currentTime backward by hand to fake a
//     reverse: stuttered, because seeking a compressed video forces a
//     keyframe decode every step, and forward-playback keyframe spacing
//     isn't placed for a frame-by-frame rewind.
//   - one element, swapping `src` between the two clips on `ended`: the
//     new source has to load before it can paint a frame, so every switch
//     showed a flash of black first.
// Keeping both clips permanently mounted and crossfading their opacity
// means the outgoing clip is still on screen, still playing, for the whole
// handover — there's never a frame where neither has anything to show. The
// crossfade itself is a plain CSS transition on opacity (see .bg), not
// driven from here.

// How long the fade takes, in seconds. Mirrors the opacity transition on
// .bg, and the handover is started this far *before* the outgoing clip runs
// out rather than when it ends.
//
// Waiting for `ended` was a bug worth naming: by the time it fires the clip
// is already sitting on its last frame, so the fade — the one moment both
// clips are on screen, and the whole reason there are two of them — played
// out over a still. Starting it early keeps both moving throughout.
const CROSSFADE = 0.35;

// How long to hold the partner clip back before loading it regardless.
const WARM_FALLBACK_MS = 4000;

export function useAlternatingVideo(
  refA: RefObject<HTMLVideoElement | null>,
  refB: RefObject<HTMLVideoElement | null>,
) {
  useEffect(() => {
    const a = refA.current;
    const b = refB.current;
    if (!a || !b) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let current = a;
    let next = b;
    let timer = 0;
    let disposed = false;

    // Clips this browser turned out not to be able to play, or which never
    // arrived. A broken one is never handed to again and the other carries
    // the scene alone — losing one clip costs the alternation, not the
    // background. Losing both leaves the poster, which is what it is for.
    const broken = new Set<HTMLVideoElement>();

    a.loop = false;
    b.loop = false;

    const rewind = (el: HTMLVideoElement) => {
      // Setting currentTime before metadata has landed is either ignored or
      // throws, depending on the browser — and either way the clip resumes
      // from wherever it left off rather than from its head.
      if (el.readyState < HTMLMediaElement.HAVE_METADATA) return;
      try {
        el.currentTime = 0;
      } catch {
        // Not seekable after all. The next cycle will catch it.
      }
    };

    const gestures = ['pointerdown', 'touchstart', 'keydown'] as const;

    const onGesture = () => {
      if (disposed) return;
      stopWaiting();
      play(current);
    };

    function waitForGesture() {
      for (const type of gestures) {
        window.addEventListener(type, onGesture, { once: true, passive: true });
      }
    }

    function stopWaiting() {
      for (const type of gestures) {
        window.removeEventListener(type, onGesture);
      }
    }

    function play(el: HTMLVideoElement) {
      rewind(el);
      const started = el.play();
      // Muted autoplay is permitted nearly everywhere, but not quite: iOS in
      // Low Power Mode and Android with Data Saver on both refuse it, and a
      // rejected promise here used to mean a background that simply never
      // moved. The poster stays up meanwhile and the first touch picks the
      // footage up from there.
      if (started) started.catch(() => !disposed && waitForGesture());
    }

    // Sets the handover timer from where the playhead actually is. Re-armed
    // on every progress event, so a clip that buffers, or that a background
    // tab throttles, re-aims rather than handing over early.
    //
    // It doubles as the stall guard: if playback wedges the timer still
    // fires and hands over to the partner, where waiting on `ended` alone
    // left the background frozen for the rest of the visit.
    function arm() {
      window.clearTimeout(timer);
      if (disposed) return;
      const { duration, currentTime } = current;
      // Still NaN — the loadedmetadata listener below will arm it.
      if (!Number.isFinite(duration) || duration <= 0) return;
      const left = (duration - CROSSFADE - currentTime) * 1000;
      timer = window.setTimeout(hand, Math.max(0, left));
    }

    // Brings the partner up and takes the outgoing clip down. Both are
    // playing across the whole fade.
    function hand() {
      if (disposed) return;
      window.clearTimeout(timer);

      if (broken.has(next)) {
        // Nowhere to hand to — loop this one on its own instead.
        play(current);
        arm();
        return;
      }

      play(next);
      next.style.opacity = '1';
      current.style.opacity = '0';
      [current, next] = [next, current];
      arm();
    }

    const onProgress = (event: Event) => {
      if (event.currentTarget === current) arm();
    };

    // Last resort. The timer should have handed over a crossfade ago; if it
    // somehow didn't, this keeps the background off a still.
    const onEnded = (event: Event) => {
      if (event.currentTarget === current) hand();
    };

    const onError = (event: Event) => {
      const el = event.currentTarget as HTMLVideoElement;
      broken.add(el);
      if (broken.size === 2) {
        window.clearTimeout(timer);
        return;
      }
      if (el === current) hand();
    };

    // The partner's couple of megabytes have no business competing with the
    // clip actually on screen, so it waits until this one can play and then
    // loads across the four seconds it has in hand. `preload="none"` in the
    // markup is what holds it back until here.
    const warmPartner = () => {
      if (disposed || next.preload === 'auto') return;
      next.preload = 'auto';
      next.load();
    };

    for (const el of [a, b]) {
      el.addEventListener('timeupdate', onProgress);
      el.addEventListener('loadedmetadata', onProgress);
      el.addEventListener('playing', onProgress);
      el.addEventListener('ended', onEnded);
      el.addEventListener('error', onError);
    }
    a.addEventListener('canplay', warmPartner, { once: true });
    // If the first clip never gets that far — a slow link, or a codec this
    // browser turns out not to want — the partner shouldn't be held behind
    // it indefinitely.
    const warmFallback = window.setTimeout(warmPartner, WARM_FALLBACK_MS);

    play(a);
    arm();

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.clearTimeout(warmFallback);
      stopWaiting();
      for (const el of [a, b]) {
        el.removeEventListener('timeupdate', onProgress);
        el.removeEventListener('loadedmetadata', onProgress);
        el.removeEventListener('playing', onProgress);
        el.removeEventListener('ended', onEnded);
        el.removeEventListener('error', onError);
      }
      a.removeEventListener('canplay', warmPartner);
    };
  }, [refA, refB]);
}
