import { useEffect, useRef } from 'react';

// Drives a pinned sequence: one tall scroll track with a sticky, viewport-
// sized stage inside it. Scrolling the track doesn't move the stage — it
// advances what plays on it. Used by the hero, the featured rail and the
// closing walk; each owns its own track, and custom properties only inherit
// downward, so they read the same names without seeing each other's values.
//
// Everything is published as custom properties on the track element. Where a
// layer sits at a given progress is a styling decision and stays in the
// stylesheet; this file only says how far through we are.

// Fraction of the remaining distance covered per frame. Both the pointer and
// the wheel arrive in coarse jumps — a wheel notch is ~100px — and stepping
// straight to the target makes the footage stutter in sympathy. Easing turns
// each jump into a glide.
const EASE = 0.1;
// Below this the layers are within a fraction of a pixel, and the playhead
// within a fraction of a frame, of where they're headed.
const SETTLED = 0.0005;
const FRAME = 1 / 48;
// Progress is 0..1 across a track several screens tall, so a hundredth of a
// percent of it is around a pixel of scrolling — close enough to call
// arrived.
const PROGRESS_SETTLED = 0.0001;
// Progress at which the hero's copy has finished fading out. Mirrors the end
// of the clamp() in .heroText.
const HERO_COPY_GONE = 0.55;

// The same footage twice, because a phone cannot scrub the first one.
//
// Scrubbing a video means setting currentTime on it while it is paused, and
// mobile browsers — iOS Safari above all — will not paint a frame that
// arrives that way for a video the user has never played. The element simply
// goes blank the moment the scroll touches it.
//
// Autoplaying a loop instead does work, but it throws away the whole point:
// the footage stops answering the finger. So a touch device gets the same
// move made out of stills — a strip of frames drawn to a canvas, one per
// scroll position. No playback, so no autoplay policy to lose to, no Low
// Power Mode to be refused by, and the picture tracks the finger exactly as
// it does a wheel on the desktop.
//
// It is also lighter: the hero's frames come to about a megabyte against the
// 1.6 MB of its all-keyframe video, and the other two to far less.
type FrameStrip = {
  // Directory the numbered frames live in, without a trailing slash.
  base: string;
  // How many there are. They are named 001.jpg upward, three digits.
  count: number;
};

type Sources = {
  // All-keyframe cut, seekable frame-accurately. Pointer devices only.
  scrub: string;
  // The same seconds as stills, for everywhere else.
  frames: FrameStrip;
};

type Options = {
  // Skip the pointer tilt, and take the frame strip rather than the video.
  // Set for coarse pointers: no hover to follow, and no reliable scrubbing.
  noPointer?: boolean;
  // Progress past which the track carries data-past="true". What that means
  // is the stylesheet's business — a section uses it to take something out of
  // the pointer's way once it has faded, or to let something in once it has
  // arrived.
  pastAt?: number;
  // The footage. Left unset for a section that has none.
  sources?: Sources;
  // Fetch immediately rather than waiting for the track to come within a
  // screen and a half. True for the hero, which is the first screen; false
  // for anything further down, whose megabyte has no business competing with
  // it.
  eager?: boolean;
  // How many times the footage is played across the track.
  //
  // Only meaningful for a clip that has been cut to loop — its last frame
  // matching its first — and then it is what lets a scene run far longer
  // than the footage it is made of. A corridor of thirty seconds' walking
  // costs one four-second clip played seven times, which is the difference
  // between a megabyte and ten.
  //
  // The scene's own progress stays linear whatever this is: the footage
  // cycles underneath while everything placed in the scene keeps advancing
  // in one direction.
  loops?: number;
};

function framePath(strip: FrameStrip, index: number): string {
  return `${strip.base}/${String(index + 1).padStart(3, '0')}.jpg`;
}

export function useHeroSequence({
  noPointer = false,
  pastAt = HERO_COPY_GONE,
  sources,
  eager = false,
  loops = 1,
}: Options = {}) {
  const trackRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tilt = useRef({ x: 0, y: 0 });
  const tiltTarget = useRef({ x: 0, y: 0 });
  // Where the scroll says we are, and where the sequence has eased to. Only
  // the second is ever published or drawn from: a wheel arrives in notches of
  // about a hundred pixels, and anything reading the raw value steps from
  // notch to notch while everything else glides.
  //
  // Easing it here rather than in each consumer also keeps the layers on one
  // timeline — the footage and the copy cannot drift apart, because there is
  // only one number.
  //
  // The lag this introduces is invisible in a pinned section: nothing on
  // screen is tied to the scrollbar, so there is no reference against which
  // being a few frames behind could show.
  const progressTarget = useRef(0);
  const progress = useRef(0);
  const frame = useRef(0);
  // The frame strip, once it starts arriving, and which frame is on the
  // canvas. Held as refs because the draw happens inside the rAF loop and
  // must not cost a render.
  const strip = useRef<HTMLImageElement[]>([]);
  // Lets the fetching effect nudge the animation loop when a frame lands.
  // Without it a reader who scrolls to a section and stops before its strip
  // has arrived would sit looking at the poster until they moved again.
  const wakeRef = useRef<() => void>(() => {});
  const painted = useRef(-1);

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Whether the playhead is ours to move. A coarse pointer gets the frame
  // strip instead — same sequence, drawn rather than decoded.
  const scrubbing = !noPointer;

  // Fetches the footage, in whichever form this device can actually use.
  // Separate from the sequence effect below so it runs even for a
  // reduced-motion visitor, who still needs a first frame to look at.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !sources) return;

    let cancelled = false;

    const attach = () => {
      if (cancelled) return;

      if (scrubbing) {
        const video = videoRef.current;
        if (!video) return;
        video.src = sources.scrub;
        // Nothing here ever plays on its own; the playhead is moved by hand.
        video.pause();
        return;
      }

      // Every frame is requested at once and they arrive in whatever order
      // the network gives them. The draw below always falls back to the
      // nearest one that has landed, so the sequence is usable from the first
      // arrival rather than after the last.
      strip.current = Array.from({ length: sources.frames.count }, (_, i) => {
        const img = new Image();
        img.decoding = 'async';
        // Each arrival is a chance to improve on whatever the canvas is
        // currently showing — paint() always draws the nearest frame it has.
        img.onload = () => wakeRef.current();
        img.src = framePath(sources.frames, i);
        return img;
      });
    };

    if (eager || typeof IntersectionObserver === 'undefined') {
      attach();
      return () => {
        cancelled = true;
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        attach();
        observer.disconnect();
      },
      { rootMargin: '150% 0px' },
    );

    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [sources, scrubbing, eager]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    // Someone who asked for less motion gets the opening frame and nothing
    // else: no tilt, no scrub, no approach. The properties are left unset so
    // the stylesheet's own fallbacks (0) apply throughout.
    if (reduced) return;

    const video = videoRef.current;

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

    // Puts the wanted frame on the canvas, or the nearest one that has
    // arrived. Searching outward matters while the strip is still loading:
    // without it the canvas would stay empty until the exact frame landed,
    // and the reader would scroll through nothing.
    const paint = (want: number) => {
      const images = strip.current;
      if (images.length === 0) return;

      let found = -1;
      for (let step = 0; step < images.length; step++) {
        const before = want - step;
        const after = want + step;
        if (before >= 0 && images[before].complete) {
          found = before;
          break;
        }
        if (after < images.length && images[after].complete) {
          found = after;
          break;
        }
      }
      if (found < 0 || found === painted.current) return;

      const canvas = canvasRef.current;
      const image = images[found];
      if (!canvas || !image.naturalWidth) return;

      // The canvas takes the frames' own pixel size once, and CSS scales it
      // to the stage. Drawing at native size and letting the compositor do
      // the rest is cheaper than resizing 64 images by hand.
      if (canvas.width !== image.naturalWidth) {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
      }

      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, 0, 0);
      painted.current = found;
    };

    const step = () => {
      frame.current = 0;
      let busy = false;

      // The sequence's own clock, eased toward where the scroll has asked it
      // to be. Everything below reads this, and it is the only thing
      // published to the stylesheet.
      const drift = progressTarget.current - progress.current;
      if (Math.abs(drift) > PROGRESS_SETTLED) {
        progress.current += drift * EASE;
        busy = true;
      } else {
        progress.current = progressTarget.current;
      }
      el.style.setProperty('--hero-progress', progress.current.toFixed(4));
      // Published for the stylesheet to key on; what it means for a given
      // section is set by pastAt. Both uses so far are about the pointer:
      // something invisible that must stop catching it, or something arrived
      // that should start.
      el.dataset.past = progress.current > pastAt ? 'true' : 'false';

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

      // Where the footage itself is, which is not where the scene is once the
      // clip is being cycled. Wrapping with a modulo is what turns a short
      // loop into a long walk.
      const phase = loops === 1 ? progress.current : (progress.current * loops) % 1;

      if (scrubbing && video) {
        const duration = video.duration;
        // Metadata hasn't landed yet — duration is NaN until it does, and
        // seeking against that would throw the playhead back to the start.
        if (Number.isFinite(duration) && duration > 0) {
          // Straight to where the clock says, not eased toward it: the clock
          // is already smoothed, and easing again on top of it would leave
          // the footage trailing the copy it is meant to move with. The
          // deadband is only there to skip seeks too small to show.
          const want = phase * duration;
          if (Math.abs(want - video.currentTime) > FRAME) {
            video.currentTime = want;
          }
        }
        // No `busy` while duration is still NaN. It is NaN for as long as the
        // element has no source at all — which, for the sections below the
        // fold, is until the reader comes near them — and spinning a frame
        // loop against that pins a core for the whole visit doing nothing.
        // The loadedmetadata listener below wakes the loop when there is
        // actually something to seek.
      } else if (!scrubbing && strip.current.length > 0) {
        // No easing of its own: the clock above is already smoothed, and
        // easing a second time on top of it only adds lag.
        paint(Math.round(phase * (strip.current.length - 1)));
      }

      if (busy) frame.current = requestAnimationFrame(step);
    };

    const wake = () => {
      if (!frame.current) frame.current = requestAnimationFrame(step);
    };
    wakeRef.current = wake;

    // Only records where the scroll now is; the loop above is what moves the
    // sequence there.
    const onScroll = () => {
      progressTarget.current = readProgress();
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      // A pen or finger reports here too, but only while actually touching the
      // screen — following those would yank the stage sideways on every tap,
      // so only a hovering mouse drives the tilt.
      if (event.pointerType !== 'mouse') return;
      tiltTarget.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
      wake();
    };

    // Pointer gone from the window entirely — drift back to centre rather than
    // freezing wherever it happened to leave.
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
    // restores the scroll position, and without this the sequence would sit on
    // frame one while it is already halfway through.
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
      wakeRef.current = () => {};
    };
  }, [noPointer, pastAt, scrubbing, reduced, loops]);

  // How long a track is — and so how much scrolling its sequence takes — is
  // left entirely to the stylesheet, which varies it by breakpoint. The sums
  // above read the rendered geometry rather than any agreed number, so there
  // is nothing here to keep in step with it.
  return { trackRef, stickyRef, videoRef, canvasRef };
}
