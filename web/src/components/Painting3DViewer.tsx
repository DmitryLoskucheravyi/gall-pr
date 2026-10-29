import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cdnImage } from '../utils/imageUrl';
import styles from './Painting3DViewer.module.scss';

type Rotation = { x: number; y: number };

const MAX_TILT = 24;
const DEFAULT_ASPECT = 4 / 5;
// Stretcher-bar depth of the canvas box, in px. The SCSS builds every side
// face from the same custom property, so this is the single knob.
const DEPTH = 26;
// Flick physics: how much of the release velocity survives each frame, and
// where the spin is considered stopped.
const SPIN_DECAY = 0.95;
const SPIN_STOP = 0.05;

function clamp(value: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, value));
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function Painting3DViewer({
  imageUrl,
  title,
}: {
  imageUrl: string;
  title?: string;
}) {
  const { t } = useTranslation('painting');
  // One sized URL for both the front face and the edge slivers — same cache
  // entry, and no 3 MB original for what is at most a 640px-wide box.
  const src = cdnImage(imageUrl, 1280);
  // The pose lives in a ref and is written straight to the DOM, once per
  // frame (see paint()). It used to be React state: every pointermove and
  // every frame of a flick re-rendered the component and reset a handful of
  // custom properties that the whole box inherits — and with them the
  // brightness filters on the painting and on the textured back, which made
  // the browser re-rasterise the most expensive layers on the page sixty
  // times a second. Now a frame touches only transforms and opacities, which
  // the compositor handles without repainting anything.
  const rotationRef = useRef<Rotation>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT);
  // The side faces are positioned with translateZ(width/2) / translateZ(
  // height/2), and CSS can't know its own rendered box there — so the card
  // is measured and handed back in as custom properties.
  const [size, setSize] = useState({ w: 0, h: 0 });

  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const shadeFrontRef = useRef<HTMLDivElement>(null);
  const shadeBackRef = useRef<HTMLDivElement>(null);
  const paintFrameRef = useRef(0);
  const draggingRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startRotation: Rotation;
  } | null>(null);
  // Smoothed yaw velocity (deg/ms) sampled during the drag, spent by the
  // inertia loop after release.
  const velocityRef = useRef({ v: 0, lastY: 0, lastT: 0 });
  const spinFrameRef = useRef(0);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // Writes the current pose and its lighting to the DOM. A fixed light up and
  // to the left: the sheen slides across the canvas as it turns and the faces
  // dim as they turn away. This response to a stable light source is most of
  // what reads as "an object", rather than "a picture on a turntable".
  const paint = () => {
    paintFrameRef.current = 0;
    const card = cardRef.current;
    if (!card) return;
    const { x, y } = rotationRef.current;
    const scale = draggingRef.current ? 1.03 : 1;
    card.style.transform = `rotateX(${x}deg) rotateY(${y}deg) scale(${scale})`;

    const yawRad = (y * Math.PI) / 180;
    const facing = Math.cos(yawRad); // 1 = front to viewer, -1 = back
    // Dimming as a black veil's opacity rather than a brightness filter: same
    // look (brightness 0.68 at worst), but compositor-only.
    if (shadeFrontRef.current) {
      shadeFrontRef.current.style.opacity = String(0.32 * (1 - Math.max(0, facing)));
    }
    if (shadeBackRef.current) {
      shadeBackRef.current.style.opacity = String(0.32 * (1 - Math.max(0, -facing)));
    }
    // The sheen is a band 2.8× the face's width, slid across it by
    // transform — the old background-position repainted it every frame.
    if (glareRef.current) {
      const pos = clamp(0.5 + Math.sin(yawRad) * 1.1, -0.6, 1.6);
      glareRef.current.style.transform = `translate3d(${(-pos * 1.8 * 100) / 2.8}%, 0, 0)`;
      glareRef.current.style.opacity = String(Math.max(0, facing) * 0.55);
    }
  };

  const schedulePaint = () => {
    if (!paintFrameRef.current) paintFrameRef.current = requestAnimationFrame(paint);
  };

  useEffect(() => {
    paint();
    // The inertia loop and any pending paint live outside React's event
    // flow — cancel them on unmount, not just on the next grab.
    return () => {
      cancelAnimationFrame(spinFrameRef.current);
      cancelAnimationFrame(paintFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopSpin = () => {
    cancelAnimationFrame(spinFrameRef.current);
    setSpinning(false);
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (dragRef.current) return; // second finger — one drives, others ignored

    stopSpin();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    setDragging(true);
    draggingRef.current = true;
    const rotation = rotationRef.current;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: rotation,
    };
    velocityRef.current = { v: 0, lastY: rotation.y, lastT: performance.now() };
    schedulePaint();
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const nextY = drag.startRotation.y + dx * 0.4;

    const now = performance.now();
    const sample = velocityRef.current;
    const dt = now - sample.lastT;
    if (dt > 0) {
      const instant = (nextY - sample.lastY) / dt;
      // Low-pass the samples: raw pointer deltas are jittery, and the spin
      // should take off with the gesture's overall speed, not whatever the
      // final millimetre happened to do.
      sample.v = sample.v * 0.7 + instant * 0.3;
      sample.lastY = nextY;
      sample.lastT = now;
    }

    rotationRef.current = {
      y: nextY,
      x: clamp(drag.startRotation.x - dy * 0.4, -MAX_TILT, MAX_TILT),
    };
    schedulePaint();
  };

  const endDrag = (event: React.PointerEvent, withInertia: boolean) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;

    dragRef.current = null;
    setDragging(false);
    draggingRef.current = false;
    schedulePaint();

    // Turn a fast release into a free spin that winds itself down.
    let v = withInertia && !prefersReducedMotion() ? velocityRef.current.v * 16 : 0;
    if (Math.abs(v) < 0.5) return;

    setSpinning(true);
    const step = () => {
      v *= SPIN_DECAY;
      if (Math.abs(v) < SPIN_STOP) {
        setSpinning(false);
        return;
      }
      rotationRef.current = { ...rotationRef.current, y: rotationRef.current.y + v };
      paint();
      spinFrameRef.current = requestAnimationFrame(step);
    };
    spinFrameRef.current = requestAnimationFrame(step);
  };

  const handleReset = () => {
    stopSpin();
    // To the nearest full turn, not to literal zero — after a few spins the
    // raw angle is huge, and resetting to 0 would animate back through every
    // one of them.
    const prev = rotationRef.current;
    rotationRef.current = { x: 0, y: Math.round(prev.y / 360) * 360 };
    schedulePaint();
  };

  const interacting = dragging || spinning;

  return (
    <div className={styles.stage}>
      {/* Idle sway lives on this wrapper as a pure CSS animation, so the
          resting scene breathes without React rendering a single frame.
          It pauses (not resets) the moment the visitor takes over. */}
      <div
        className={`${styles.float} ${interacting ? styles.floatPaused : ''}`}
      >
        <div
          ref={cardRef}
          className={`${styles.card} ${interacting ? styles.live : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => endDrag(event, true)}
          onPointerCancel={(event) => endDrag(event, false)}
          onDoubleClick={handleReset}
          style={
            {
              aspectRatio: `${aspectRatio}`,
              '--ar': aspectRatio,
              '--w': `${size.w}px`,
              '--h': `${size.h}px`,
              '--d': `${DEPTH}px`,
              '--img': `url("${src}")`,
            } as React.CSSProperties
          }
        >
          <div className={styles.face}>
            <img src={src} alt="" draggable={false} className={styles.image} />
            <div ref={shadeFrontRef} className={styles.shade} />
            <div className={styles.glareTrack}>
              <div ref={glareRef} className={styles.glare} />
            </div>
          </div>

          {/* The reverse of a stretched canvas, built the way one is: raw
              linen across the back, a pine stretcher mitred at the corners
              with a cross-brace and corner keys, the primed canvas folded
              over the bars and stapled, a hanging wire, and the gallery's
              label. Painted from back to front — each layer sits on the one
              before it, as the real thing does. Purely decorative. */}
          <div className={styles.faceBack} aria-hidden="true">
            <div className={styles.back}>
              <span className={styles.field} />

              <span className={`${styles.brace} ${styles.braceH}`} />
              <span className={`${styles.brace} ${styles.braceV}`} />

              <span className={`${styles.bar} ${styles.barTop}`} />
              <span className={`${styles.bar} ${styles.barBottom}`} />
              <span className={`${styles.bar} ${styles.barLeft}`} />
              <span className={`${styles.bar} ${styles.barRight}`} />

              <span className={styles.keys}>
                <span className={styles.key} data-corner="tl" />
                <span className={styles.key} data-corner="tr" />
                <span className={styles.key} data-corner="bl" />
                <span className={styles.key} data-corner="br" />
              </span>

              <span className={styles.foldShadow}>
                <span className={styles.fold} />
              </span>

              <span className={`${styles.staples} ${styles.staplesTop}`} />
              <span className={`${styles.staples} ${styles.staplesBottom}`} />
              <span className={`${styles.staples} ${styles.staplesLeft}`} />
              <span className={`${styles.staples} ${styles.staplesRight}`} />

              <svg
                className={styles.wire}
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <path d="M0 1 Q50 13 100 1" vectorEffect="non-scaling-stroke" />
              </svg>
              <span className={styles.ring} data-side="left" />
              <span className={styles.ring} data-side="right" />

              {title && (
                <span className={styles.label}>
                  <span className={styles.labelMark}>{t('common:brand')}</span>
                  <span className={styles.labelTitle}>{title}</span>
                  <span className={styles.labelMeta}>{t('stretcherLabel')}</span>
                </span>
              )}
            </div>
            <div ref={shadeBackRef} className={styles.shade} />
          </div>

          {/* The stretcher sides. Each carries a mirrored sliver of the
              painting itself, blurred — a gallery wrap, paint folding over
              the edge, instead of four flat grey walls. */}
          <div className={`${styles.edge} ${styles.edgeLeft}`} />
          <div className={`${styles.edge} ${styles.edgeRight}`} />
          <div className={`${styles.edge} ${styles.edgeTop}`} />
          <div className={`${styles.edge} ${styles.edgeBottom}`} />
        </div>
      </div>

    </div>
  );
}
