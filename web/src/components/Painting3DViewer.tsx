import { useEffect, useRef, useState } from 'react';

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
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function Painting3DViewer({
  imageUrl,
  title,
}: {
  imageUrl: string;
  title?: string;
}) {
  // One sized URL for both the front face and the edge slivers — same cache
  // entry, and no 3 MB original for what is at most a 640px-wide box.
  const src = cdnImage(imageUrl, 1280);
  const [rotation, setRotation] = useState<Rotation>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT);
  // The side faces are positioned with translateZ(width/2) / translateZ(
  // height/2), and CSS can't know its own rendered box there — so the card
  // is measured and handed back in as custom properties.
  const [size, setSize] = useState({ w: 0, h: 0 });

  const cardRef = useRef<HTMLDivElement>(null);
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

  // The inertia loop lives outside React's event flow — cancel it on
  // unmount, not just on the next grab.
  useEffect(() => () => cancelAnimationFrame(spinFrameRef.current), []);

  const stopSpin = () => {
    cancelAnimationFrame(spinFrameRef.current);
    setSpinning(false);
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (dragRef.current) return; // second finger — one drives, others ignored

    stopSpin();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    setDragging(true);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: rotation,
    };
    velocityRef.current = { v: 0, lastY: rotation.y, lastT: performance.now() };
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

    setRotation({
      y: nextY,
      x: clamp(drag.startRotation.x - dy * 0.4, -MAX_TILT, MAX_TILT),
    });
  };

  const endDrag = (event: React.PointerEvent, withInertia: boolean) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;

    dragRef.current = null;
    setDragging(false);

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
      setRotation((prev) => ({ ...prev, y: prev.y + v }));
      spinFrameRef.current = requestAnimationFrame(step);
    };
    spinFrameRef.current = requestAnimationFrame(step);
  };

  const handleReset = () => {
    stopSpin();
    // To the nearest full turn, not to literal zero — after a few spins the
    // raw angle is huge, and resetting to 0 would animate back through every
    // one of them.
    setRotation((prev) => ({ x: 0, y: Math.round(prev.y / 360) * 360 }));
  };

  const yawRad = (rotation.y * Math.PI) / 180;
  const facing = Math.cos(yawRad); // 1 = front to viewer, -1 = back

  // A fixed light up and to the left: the sheen slides across the canvas as
  // it turns and the faces dim as they turn away. This response to a stable
  // light source is most of what reads as "an object", rather than "a
  // picture on a turntable".
  const glarePos = 50 + Math.sin(yawRad) * 110;
  const glareOpacity = Math.max(0, facing) * 0.55;
  const frontBright = 0.68 + 0.32 * Math.max(0, facing);
  const backBright = 0.68 + 0.32 * Math.max(0, -facing);

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
          className={styles.card}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => endDrag(event, true)}
          onPointerCancel={(event) => endDrag(event, false)}
          onDoubleClick={handleReset}
          style={
            {
              aspectRatio: `${aspectRatio}`,
              '--ar': aspectRatio,
              transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${
                dragging ? 1.03 : 1
              })`,
              transition: interacting
                ? 'none'
                : 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
              '--w': `${size.w}px`,
              '--h': `${size.h}px`,
              '--d': `${DEPTH}px`,
              '--img': `url("${src}")`,
              '--glare-pos': `${glarePos}%`,
              '--glare-o': glareOpacity,
              '--front-bright': frontBright,
              '--back-bright': backBright,
            } as React.CSSProperties
          }
        >
          <div className={styles.face}>
            <img src={src} alt="" draggable={false} className={styles.image} />
            <div className={styles.glare} />
          </div>

          <div className={styles.faceBack}>
            <div className={styles.frame}>
              <div className={styles.canvasBack}>
                <span className={styles.strutH} />
                <span className={styles.strutV} />
              </div>
            </div>
            {title && (
              <span className={styles.sticker}>
                {title}
                <em>оригінал · полотно</em>
              </span>
            )}
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
