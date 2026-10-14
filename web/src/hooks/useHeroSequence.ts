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
// Progress is 0..1 across a track several screens tall, so a hundredth of a
// percent of it is around a pixel of scrolling — close enough to call
// arrived.
const PROGRESS_SETTLED = 0.0001;
// Progress at which the hero's copy has finished fading out. Mirrors the end
// of the clamp() in .heroText.
const HERO_COPY_GONE = 0.55;

// Below this the two frames either side of the playhead are blended closely
// enough that redrawing would put the same picture on the canvas.
const MIX_SETTLED = 0.01;

// How the footage is dimmed, and why it is a rectangle rather than a filter.
//
// The stylesheet used to do it with filter: brightness(0.66) on the element,
// which re-filtered the whole viewport on every frame. Moving the same filter
// onto the 2D context was not the answer either — a canvas filter puts every
// drawImage on a slower path, and it cost 32 frames in 205 over 32ms against
// 20 with it off.
//
// Black at 34% over the frame is the same arithmetic with none of that:
// source-over composites to src × 0.66 + 0 × 0.34, which is exactly what
// brightness(0.66) computes, as one fill of a 900×506 rectangle.
//
// The saturate(0.92) that went with it is gone. Eight per cent of saturation
// is not visible on footage this desaturated to begin with, and it is the
// only part of the old filter that a rectangle cannot express.
const FOOTAGE_DIM = 'rgba(0, 0, 0, 0.34)';

// The footage is a strip of stills drawn to a canvas, and only that.
//
// It used to be a video on the desktop and stills everywhere else, because a
// phone cannot scrub a video at all: iOS will not paint a frame that arrives
// from a seek on a paused video the user has never played. The desktop half
// of that is gone now, because scrubbing a video is not smooth anywhere.
//
// Seeking is not drawing. Every `currentTime =` asks the browser to find a
// keyframe, decode to it and present — tens of milliseconds, and only one can
// be in flight at a time, so a wheel that turns at 60 Hz gets a picture that
// changes maybe a dozen times a second. All-keyframe encoding makes each seek
// cheaper without making it free, and the ceiling stays where it is.
//
// Blitting a decoded image costs a fraction of a millisecond, so the strip
// tracks the wheel exactly, on every device. The cost is that there are only
// as many stills as were cut — see paint(), which dissolves between each pair
// rather than stepping from one to the next.
type FrameStrip = {
  // Directory the numbered frames live in, without a trailing slash.
  base: string;
  // How many there are. They are named 001.jpg upward, three digits.
  count: number;
};

type Options = {
  // Skip the pointer tilt. Set for coarse pointers: there is no hovering
  // cursor to follow.
  noPointer?: boolean;
  // Progress past which the track carries data-past="true". What that means
  // is the stylesheet's business — a section uses it to take something out of
  // the pointer's way once it has faded, or to let something in once it has
  // arrived.
  pastAt?: number;
  // The footage. Left unset for a section that has none.
  frames?: FrameStrip;
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
  frames: footage,
  eager = false,
  loops = 1,
}: Options = {}) {
  const trackRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
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
  // What is on the canvas: the pair of frames last blended onto it, and how
  // far between them. Three numbers rather than one, because the picture now
  // changes without the nearer frame changing.
  const painted = useRef({ a: -1, b: -1, mix: -1 });
  const context = useRef<CanvasRenderingContext2D | null>(null);

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fetches the strip. Separate from the sequence effect below so it runs
  // even for a reduced-motion visitor, who still needs a first frame to look
  // at.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !footage) return;

    let cancelled = false;
    let attached = false;

    const attach = () => {
      if (cancelled || attached) return;
      attached = true;

      // Every frame is requested at once and they arrive in whatever order
      // the network gives them. The draw below always falls back to the
      // nearest one that has landed, so the sequence is usable from the first
      // arrival rather than after the last.
      painted.current = { a: -1, b: -1, mix: -1 };
      strip.current = Array.from({ length: footage.count }, (_, i) => {
        const img = new Image();
        img.decoding = 'async';
        // Each arrival is a chance to improve on whatever the canvas is
        // currently showing — paint() always draws the nearest frames it has.
        img.onload = () => wakeRef.current();
        img.src = framePath(footage, i);
        return img;
      });
    };

    // Lets a strip go once its section is well out of the way.
    //
    // Forty-eight frames at 900px wide decode to something like ninety
    // megabytes of bitmap, and the hero's strip and the corridor's together
    // are enough for a phone to drop the tab — which is one of the ways the
    // page "stopped working" without anything in it having failed. Only one
    // walk can be on screen at a time, so only one needs to be in memory;
    // coming back costs a few hundred kilobytes that are already in the HTTP
    // cache.
    const release = () => {
      if (!attached) return;
      for (const img of strip.current) img.onload = null;
      strip.current = [];
      painted.current = { a: -1, b: -1, mix: -1 };
      attached = false;
    };

    if (eager) attach();

    if (typeof IntersectionObserver === 'undefined') {
      if (!eager) attach();
      return () => {
        cancelled = true;
      };
    }

    // Kept subscribed rather than disconnected on first sight, because it
    // now has a second job: the strip is dropped again on the way out.
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? attach() : release()),
      { rootMargin: '150% 0px' },
    );

    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [footage, eager]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    // Someone who asked for less motion gets the opening frame and nothing
    // else: no tilt, no scrub, no approach. The properties are left unset so
    // the stylesheet's own fallbacks (0) apply throughout.
    if (reduced) return;

    painted.current = { a: -1, b: -1, mix: -1 };
    context.current = null;

    // How far down the viewport the stage pins, in px. Read from the
    // stylesheet rather than agreed with it, but read once per layout rather
    // than once per scroll event — getComputedStyle forces the style and
    // layout the browser was about to skip, and doing that on every wheel
    // notch is a frame's worth of work for a number that cannot have
    // changed.
    let pinTop = 0;
    const measure = () => {
      const sticky = stickyRef.current;
      pinTop = sticky ? parseFloat(getComputedStyle(sticky).top) || 0 : 0;
    };

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
      const travel = rect.height - sticky.offsetHeight;
      if (travel <= 0) return 0;
      return Math.min(1, Math.max(0, (pinTop - rect.top) / travel));
    };

    // The nearest frame to `want` that has actually arrived. Searching
    // outward matters while the strip is still loading: without it the canvas
    // would stay empty until the exact frame landed, and the reader would
    // scroll through nothing.
    const nearestReady = (want: number) => {
      const images = strip.current;
      for (let step = 0; step < images.length; step++) {
        const before = want - step;
        const after = want + step;
        if (before >= 0 && images[before]?.complete) return before;
        if (after < images.length && images[after]?.complete) return after;
      }
      return -1;
    };

    // Puts the playhead on the canvas — which falls between two frames far
    // more often than on one.
    //
    // The strip is 48 stills spread over a couple of thousand pixels of
    // scrolling, so stepping from whole frame to whole frame means the
    // picture changes about once every forty pixels. That is what reads as a
    // low frame rate even when the loop itself is running at 60: the motion
    // is quantised, not dropped.
    //
    // So the two frames either side are blended by however far between them
    // the playhead is. It is a dissolve rather than real intermediate
    // motion, but the footage is slow macro paint with no hard edges, which
    // is exactly the material a dissolve is invisible on. Two drawImage calls
    // of a decoded 900px still cost a fraction of a millisecond.
    const paint = (pos: number) => {
      const images = strip.current;
      if (images.length === 0) return;

      const lower = Math.floor(pos);
      const mix = pos - lower;

      const a = nearestReady(lower);
      if (a < 0) return;
      // Past the last frame, or close enough to one, there is nothing to
      // blend towards.
      const b = mix > MIX_SETTLED ? nearestReady(lower + 1) : a;

      const was = painted.current;
      if (was.a === a && was.b === b && Math.abs(was.mix - mix) < MIX_SETTLED) {
        return;
      }

      const canvas = canvasRef.current;
      const image = images[a];
      if (!canvas || !image.naturalWidth) return;

      // The canvas takes the frames' own pixel size once, and CSS scales it
      // to the stage. Drawing at native size and letting the compositor do
      // the rest is cheaper than resizing 48 images by hand.
      if (canvas.width !== image.naturalWidth) {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        // A resize drops the context's state along with its contents.
        context.current = null;
      }

      // Held between frames: fetching it is cheap, but not free, and this
      // runs sixty times a second for the length of the scroll.
      const ctx = (context.current ??= canvas.getContext('2d'));
      if (!ctx) return;

      ctx.globalAlpha = 1;
      ctx.drawImage(image, 0, 0);
      if (b >= 0 && b !== a) {
        ctx.globalAlpha = mix;
        ctx.drawImage(images[b], 0, 0);
        ctx.globalAlpha = 1;
      }

      // Over the blend, not under it: dimming each frame separately and then
      // cross-fading them would dim the overlap twice.
      ctx.fillStyle = FOOTAGE_DIM;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      painted.current = { a, b, mix };
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

      if (strip.current.length > 0) {
        // No easing of its own: the clock above is already smoothed, and
        // easing a second time on top of it only adds lag. Not rounded
        // either — the fraction is the blend, and it is the whole reason the
        // sequence moves rather than steps.
        paint(phase * (strip.current.length - 1));
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

    const onResize = () => {
      measure();
      onScroll();
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
    window.addEventListener('resize', onResize, { passive: true });
    // Place the playhead once on mount too: a reload partway down the track
    // restores the scroll position, and without this the sequence would sit on
    // frame one while it is already halfway through.
    measure();
    onScroll();

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerout', onPointerOut);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      wakeRef.current = () => {};
    };
  }, [noPointer, pastAt, reduced, loops]);

  // How long a track is — and so how much scrolling its sequence takes — is
  // left entirely to the stylesheet, which varies it by breakpoint. The sums
  // above read the rendered geometry rather than any agreed number, so there
  // is nothing here to keep in step with it.
  return { trackRef, stickyRef, canvasRef };
}
