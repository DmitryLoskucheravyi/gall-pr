import { useEffect } from 'react';
import type { RefObject } from 'react';

// Plays a clip forward, then back to the start, then forward again — rather
// than a hard loop cut. Built for footage whose first and last frames don't
// quite match: a straight loop shows the seam every cycle, a boomerang never
// needs them to match at all.
//
// Real reverse playback (a negative playbackRate) isn't reliably supported
// across browsers — Safari ignores it outright — so the "rewind" here is
// done by hand: once forward playback nears the end, it's paused and a
// rAF loop walks currentTime backward at real-time speed until it reaches
// zero, then normal playback resumes. The same scrub-by-hand approach
// useHeroSequence already uses for touch devices, just driven by a clock
// instead of the scroll position.
const NEAR_END = 0.08;

export function useBoomerangVideo(ref: RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let reversing = false;
    let frame = 0;
    let lastTs = 0;

    const stepReverse = (ts: number) => {
      const dt = lastTs ? (ts - lastTs) / 1000 : 0;
      lastTs = ts;

      const next = video.currentTime - dt;
      if (next <= 0) {
        reversing = false;
        lastTs = 0;
        video.currentTime = 0;
        video.play().catch(() => {});
        return;
      }
      video.currentTime = next;
      frame = requestAnimationFrame(stepReverse);
    };

    const onTimeUpdate = () => {
      if (reversing || !video.duration) return;
      if (video.currentTime >= video.duration - NEAR_END) {
        video.pause();
        reversing = true;
        lastTs = 0;
        frame = requestAnimationFrame(stepReverse);
      }
    };

    video.loop = false;
    video.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
}
