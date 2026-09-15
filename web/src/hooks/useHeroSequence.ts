import { useCallback, useEffect, useRef, useState } from 'react';

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

// How long to give a scrub video to produce metadata before giving up on it
// and taking the frame strip instead. Generous: it only has to beat a slow
// connection, and the poster is up the whole time.
const METADATA_GRACE_MS = 8000;

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

// Which of the two the sequence is currently running on. The component reads
// it to decide whether to mount a <video> or a <canvas>; it can change after
// mount, because the guess below is only a guess (see canScrubVideo).
export type SequenceMode = 'video' | 'frames';

type Options = {
  // Skip the pointer tilt. Set for coarse pointers: there is no hovering
  // cursor to follow.
  //
  // This used to decide the footage as well, and the two are not the same
  // question — see canScrubVideo. A touchscreen laptop has no hover worth
  // following and scrubs video perfectly well; an iPad with a keyboard case
  // reports a hovering pointer and cannot scrub at all.
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

// Whether this browser will actually paint a frame that arrives from a seek
// on a paused video it has never played.
//
// It comes down to iOS and iPadOS, which will not, and which is the whole
// reason a frame strip exists. Asking `(hover: none)` for it was close but
// not the same question, and it was wrong at both ends: an iPad with a
// keyboard case reports a hovering pointer and was handed the video path it
// cannot draw — a hero that stayed on its poster for the entire scroll —
// while a Windows laptop with a touchscreen reported none and was handed
// frames it had no need of.
//
// A guess either way, which is why it is only the starting position: a video
// that errors or never produces metadata downgrades itself to the strip at
// runtime, and that is what covers the devices this list doesn't name.
function canScrubVideo(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return true;
  }

  const ua = navigator.userAgent;
  if (/iPhone|iPod|iPad/.test(ua)) return false;
  // iPadOS 13 and up report themselves as a Mac. The touch points are what
  // give them away — a Mac reports none, with or without a touchscreen
  // display plugged into it.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return false;

  // Anything else without hover is a phone or a tablet, and the strip is
  // both safer and lighter there regardless of what it could have managed.
  return !window.matchMedia('(hover: none)').matches;
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

  const [mode, setMode] = useState<SequenceMode>(() =>
    sources && canScrubVideo() ? 'video' : 'frames',
  );

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
  const scrubbing = mode === 'video';

  // Gives up on the video and takes the strip instead. Called when the
  // element reports an error — a codec this browser won't decode, a file
  // that 404s — or when metadata simply never arrives.
  //
  // Idempotent, and one-way: nothing ever upgrades back to video, because
  // whatever went wrong the first time is unlikely to have improved and a
  // sequence that flips back and forth is worse than one that settles.
  const downgrade = useCallback(() => {
    setMode((was) => {
      if (was === 'frames') return was;
      // Whatever is on the canvas now belongs to a different element.
      painted.current = -1;
      return 'frames';
    });
  }, []);

  // Fetches the footage, in whichever form this device can actually use.
  // Separate from the sequence effect below so it runs even for a
  // reduced-motion visitor, who still needs a first frame to look at.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !sources) return;

    let cancelled = false;
    let attached = false;
    let grace = 0;

    const video = videoRef.current;

    const onVideoError = () => downgrade();
    const onMetadata = () => window.clearTimeout(grace);

    const attach = () => {
      if (cancelled || attached) return;
      attached = true;

      if (scrubbing) {
        if (!video) return;
        video.addEventListener('error', onVideoError);
        video.addEventListener('loadedmetadata', onMetadata);
        video.src = sources.scrub;
        // Nothing here ever plays on its own; the playhead is moved by hand.
        video.pause();
        // A source the browser accepts but never gets anywhere with looks
        // exactly like one that is merely slow, right up until the reader
        // has scrolled the whole section past a frozen poster. Past this it
        // is treated as the former and the strip takes over.
        grace = window.setTimeout(() => {
          if (video.readyState < HTMLMediaElement.HAVE_METADATA) downgrade();
        }, METADATA_GRACE_MS);
        return;
      }

      // Every frame is requested at once and they arrive in whatever order
      // the network gives them. The draw below always falls back to the
      // nearest one that has landed, so the sequence is usable from the first
      // arrival rather than after the last.
      painted.current = -1;
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
      if (!attached || scrubbing) return;
      for (const img of strip.current) img.onload = null;
      strip.current = [];
      painted.current = -1;
      attached = false;
    };

    if (eager) attach();

    if (typeof IntersectionObserver === 'undefined') {
      if (!eager) attach();
      return () => {
        cancelled = true;
        window.clearTimeout(grace);
        video?.removeEventListener('error', onVideoError);
        video?.removeEventListener('loadedmetadata', onMetadata);
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
      window.clearTimeout(grace);
      observer.disconnect();
      video?.removeEventListener('error', onVideoError);
      video?.removeEventListener('loadedmetadata', onMetadata);
    };
  }, [sources, scrubbing, eager, downgrade]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    // Someone who asked for less motion gets the opening frame and nothing
    // else: no tilt, no scrub, no approach. The properties are left unset so
    // the stylesheet's own fallbacks (0) apply throughout.
    if (reduced) return;

    const video = scrubbing ? videoRef.current : null;
    // The canvas element changes identity when the mode does, so nothing
    // already drawn can be assumed to still be on it.
    painted.current = -1;

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

      if (video) {
        const duration = video.duration;
        // Metadata hasn't landed yet — duration is NaN until it does, and
        // seeking against that would throw the playhead back to the start.
        if (Number.isFinite(duration) && duration > 0) {
          // Straight to where the clock says, not eased toward it: the clock
          // is already smoothed, and easing again on top of it would leave
          // the footage trailing the copy it is meant to move with. The
          // deadband is only there to skip seeks too small to show.
          //
          // One seek at a time, though. Chrome absorbs a stream of them by
          // dropping all but the last; Firefox and Safari queue them, and a
          // scroll that issues one per frame leaves the picture running
          // whole seconds behind the wheel — long enough, on a flick down a
          // corridor, to read as stuck. Skipping while one is in flight and
          // letting `seeked` wake the loop gives every browser Chrome's
          // behaviour, and the target it then re-reads is the current one
          // rather than a stale queued guess.
          if (
            !video.seeking &&
            Math.abs(phase * duration - video.currentTime) > FRAME
          ) {
            video.currentTime = phase * duration;
          }
        }
        // No `busy` while duration is still NaN. It is NaN for as long as the
        // element has no source at all — which, for the sections below the
        // fold, is until the reader comes near them — and spinning a frame
        // loop against that pins a core for the whole visit doing nothing.
        // The loadedmetadata listener below wakes the loop when there is
        // actually something to seek.
      } else if (strip.current.length > 0) {
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
    video?.addEventListener('loadedmetadata', onScroll);
    // Picks up the seek that the deadband above skipped while one was
    // already in flight.
    video?.addEventListener('seeked', wake);
    measure();
    onScroll();

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerout', onPointerOut);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      video?.removeEventListener('loadedmetadata', onScroll);
      video?.removeEventListener('seeked', wake);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      wakeRef.current = () => {};
    };
  }, [noPointer, pastAt, scrubbing, reduced, loops]);

  // How long a track is — and so how much scrolling its sequence takes — is
  // left entirely to the stylesheet, which varies it by breakpoint. The sums
  // above read the rendered geometry rather than any agreed number, so there
  // is nothing here to keep in step with it.
  return { trackRef, stickyRef, videoRef, canvasRef, mode };
}
