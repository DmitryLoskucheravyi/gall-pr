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
export function useAlternatingVideo(
  refA: RefObject<HTMLVideoElement | null>,
  refB: RefObject<HTMLVideoElement | null>,
) {
  useEffect(() => {
    const a = refA.current;
    const b = refB.current;
    if (!a || !b) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    a.loop = false;
    b.loop = false;
    a.currentTime = 0;
    a.play().catch(() => {});

    let current = a;
    let next = b;

    const swap = () => {
      next.currentTime = 0;
      next.play().catch(() => {});
      next.style.opacity = '1';
      current.style.opacity = '0';
      [current, next] = [next, current];
    };

    const onEndedA = () => {
      if (current === a) swap();
    };
    const onEndedB = () => {
      if (current === b) swap();
    };

    a.addEventListener('ended', onEndedA);
    b.addEventListener('ended', onEndedB);

    return () => {
      a.removeEventListener('ended', onEndedA);
      b.removeEventListener('ended', onEndedB);
    };
  }, [refA, refB]);
}
