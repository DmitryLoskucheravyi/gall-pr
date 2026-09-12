import { useEffect, useRef } from 'react';

// Drives the pinned hero: one tall scroll track with a sticky, viewport-sized
// stage inside it. Scrolling the track doesn't move the stage — it advances
// the sequence playing on it. The footage scrubs forward, the copy comes
// toward the reader and passes them, and only once the track is spent does
// the page below scroll up into view.
//
// Everything is published as custom properties on the track element, which
// the stylesheet reads and inherits down to the layers. Where each layer
// sits at a given progress is a styling decision and stays in the
// stylesheet; this file only says how far through we are.
//
// The video is encoded with every frame a keyframe. That matters: a normal
// encode only carries one every second or two, and seeking between them
// forces the decoder to walk forward from the last one, which under a
// scroll-driven seek reads as the picture snagging.

// Fraction of the remaining distance covered per frame. Both the pointer and
// the wheel arrive in coarse jumps — a wheel notch is ~100px — and stepping
// straight to the target makes the footage stutter in sympathy. Easing turns
// each jump into a glide.
const EASE = 0.1;
// Below this the layers are within a fraction of a pixel, and the playhead
// within a fraction of a frame, of where they're headed.
const SETTLED = 0.0005;
const FRAME = 1 / 48;
// Progress at which the copy has finished fading out. Mirrors the end of the
// clamp() in .heroText — the two have to agree, or the block either keeps
// catching clicks after it is invisible or stops taking them while still
// readable.
const HERO_COPY_GONE = 0.55;

type Options = {
  // Skip the pointer tilt. Used for coarse pointers, where there's no hover
  // to follow — the scroll half still runs.
  noPointer?: boolean;
};

export function useHeroSequence({ noPointer = false }: Options = {}) {
  const trackRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const tilt = useRef({ x: 0, y: 0 });
  const tiltTarget = useRef({ x: 0, y: 0 });
  const progress = useRef(0);
  const frame = useRef(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    // Someone who asked for less motion gets the sequence's first frame and
    // nothing else: no tilt, no scrub, no approach. The properties are left
    // unset so the stylesheet's own fallbacks (0) apply throughout.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const video = videoRef.current;
    // Nothing here ever plays on its own; the playhead is moved by hand.
    video?.pause();

    // How far through the pin we are, 0..1.
    //
    // Measured against the sticky stage itself rather than the viewport: the
    // stage is a header shorter than the window and pins that far down, so
    // window.innerHeight would overstate the travel and the sequence would
    // still have a header's worth of scrolling left when it reported 1.
    //
    // The pin begins when the track's top reaches the stage's own `top`
    // offset, and ends a full (track - stage) of scrolling later.
    const readProgress = () => {
      const sticky = stickyRef.current;
      if (!sticky) return 0;
      const rect = el.getBoundingClientRect();
      const pinTop = parseFloat(getComputedStyle(sticky).top) || 0;
      const travel = rect.height - sticky.offsetHeight;
      if (travel <= 0) return 0;
      return Math.min(1, Math.max(0, (pinTop - rect.top) / travel));
    };

    const step = () => {
      frame.current = 0;
      let busy = false;

      const nx = tilt.current.x + (tiltTarget.current.x - tilt.current.x) * EASE;
      const ny = tilt.current.y + (tiltTarget.current.y - tilt.current.y) * EASE;
      tilt.current = { x: nx, y: ny };
      el.style.setProperty('--stage-x', nx.toFixed(4));
      el.style.setProperty('--stage-y', ny.toFixed(4));
      if (
        Math.abs(tiltTarget.current.x - nx) > SETTLED ||
        Math.abs(tiltTarget.current.y - ny) > SETTLED
      ) {
        busy = true;
      }

      if (video) {
        const duration = video.duration;
        // Metadata hasn't landed yet — duration is NaN until it does, and
        // seeking against that would throw the playhead back to the start.
        if (Number.isFinite(duration) && duration > 0) {
          const gap = progress.current * duration - video.currentTime;
          if (Math.abs(gap) > FRAME) {
            video.currentTime += gap * EASE;
            busy = true;
          }
        } else {
          busy = true;
        }
      }

      if (busy) frame.current = requestAnimationFrame(step);
    };

    const wake = () => {
      if (!frame.current) frame.current = requestAnimationFrame(step);
    };

    const onScroll = () => {
      progress.current = readProgress();
      el.style.setProperty('--hero-progress', progress.current.toFixed(4));
      // Past the point where the copy has finished fading. The stylesheet
      // uses it to drop the faded block out of the pointer's way — an
      // invisible headline spanning the stage would otherwise still be
      // catching clicks meant for the links inside it.
      el.dataset.heroPast = progress.current > HERO_COPY_GONE ? 'true' : 'false';
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      // A pen or finger reports here too, but only while actually touching
      // the screen — following those would yank the stage sideways on every
      // tap, so only a hovering mouse drives the tilt.
      if (event.pointerType !== 'mouse') return;
      tiltTarget.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
      wake();
    };

    // Pointer gone from the window entirely — drift back to centre rather
    // than freezing wherever it happened to leave.
    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget) return;
      tiltTarget.current = { x: 0, y: 0 };
      wake();
    };

    if (!noPointer) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerout', onPointerOut, { passive: true });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Place the playhead once on mount too: a reload partway down the track
    // restores the scroll position, and without this the hero would sit on
    // frame one while the sequence is already halfway through.
    video?.addEventListener('loadedmetadata', onScroll);
    onScroll();

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerout', onPointerOut);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      video?.removeEventListener('loadedmetadata', onScroll);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [noPointer]);

  // How long the track is — and so how much scrolling the sequence takes —
  // is left entirely to the stylesheet, which varies it by breakpoint. The
  // sums above read the rendered geometry rather than any agreed number, so
  // there is nothing here to keep in step with it.
  return { trackRef, stickyRef, videoRef };
}
