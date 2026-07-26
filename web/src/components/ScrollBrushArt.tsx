import { useEffect, useRef, useState } from 'react';

import styles from './ScrollBrushArt.module.scss';

type Point = { x: number; y: number };

type Droplet = {
  cx: number;
  cy: number;
  r: number;
  unlockY: number;
  filterId: 'brushTornA' | 'brushTornB';
};

function clamp(value: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, value));
}

// Deterministic pseudo-random, keyed by index, so widths/splatters stay
// stable across re-renders instead of reshuffling every scroll tick.
function rand(seed: number) {
  const x = Math.sin(seed * 999.7) * 10000;
  return x - Math.floor(x);
}

// A flowing wave from the very top of the document to the very bottom.
// Two overlaid sine waves (a wide slow one plus a faster, sharper one)
// mean it drifts gently most of the time but occasionally swings hard
// and quickly from side to side where the two happen to line up.
function buildCenterline(width: number, height: number): Point[] {
  const samples = 90;
  const points: Point[] = [];

  for (let i = 0; i <= samples; i++) {
    const y = (height * i) / samples;
    const wave =
      0.5 +
      Math.sin(i * 0.19) * 0.42 +
      Math.sin(i * 0.55 + 1.3) * 0.22;
    points.push({ x: width * clamp(wave, -0.15, 1.15), y });
  }

  return points;
}

// Smooth width envelope, so neighboring points never jump width
// abruptly the way independent random segments used to.
function widthAt(i: number) {
  return clamp(
    115 + Math.sin(i * 0.11) * 55 + Math.sin(i * 0.37 + 2) * 35,
    55,
    210,
  );
}

// Offsets the centerline left/right by half its local width to build a
// single filled ribbon — one continuous shape, so there's no seam where
// two independently-stroked pieces used to meet.
function buildRibbon(points: Point[]): string {
  const left: Point[] = [];
  const right: Point[] = [];

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const half = widthAt(i) / 2;

    left.push({ x: points[i].x + nx * half, y: points[i].y + ny * half });
    right.push({ x: points[i].x - nx * half, y: points[i].y - ny * half });
  }

  let d = `M ${left[0].x} ${left[0].y}`;
  for (let i = 1; i < left.length; i++) d += ` L ${left[i].x} ${left[i].y}`;
  for (let i = right.length - 1; i >= 0; i--) {
    d += ` L ${right[i].x} ${right[i].y}`;
  }
  d += ' Z';

  return d;
}

// A handful of paint droplets flung off near some of the wave's turning
// points — they pop in permanently once the line has been drawn past
// that point, like real splatter left behind by the brush.
function buildDroplets(points: Point[], width: number): Droplet[] {
  const droplets: Droplet[] = [];

  points.forEach((point, i) => {
    if (i % 6 !== 0) return;
    if (rand(i + 500) > 0.55) return;

    const clusterSize = 1 + Math.floor(rand(i + 600) * 3);
    for (let j = 0; j < clusterSize; j++) {
      const angle = rand(i * 7 + j + 700) * Math.PI * 2;
      const dist = 30 + rand(i * 11 + j + 800) * 110;

      droplets.push({
        cx: clamp(point.x + Math.cos(angle) * dist, 0, width),
        cy: point.y + Math.sin(angle) * dist * 0.6,
        r: 5 + rand(i * 13 + j + 900) * 16,
        unlockY: point.y,
        filterId: (i + j) % 2 === 0 ? 'brushTornA' : 'brushTornB',
      });
    }
  });

  return droplets;
}

export default function ScrollBrushArt() {
  const frontierRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const clipRectRef = useRef<SVGRectElement | null>(null);
  const dropletRefs = useRef<(SVGCircleElement | null)[]>([]);
  const dropletsRef = useRef<Droplet[]>([]);

  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [ribbonD, setRibbonD] = useState('');
  const [droplets, setDroplets] = useState<Droplet[]>([]);

  // Per-frame position updates go straight to the DOM instead of through
  // React state — a scroll-driven value changing every animation frame
  // would otherwise force a full component re-render (re-diffing every
  // droplet) on each tick, which is exactly what was causing the jank.
  const applyFrontier = () => {
    const y = Math.max(0, frontierRef.current);
    clipRectRef.current?.setAttribute('height', String(y));

    const list = dropletsRef.current;
    for (let i = 0; i < list.length; i++) {
      const el = dropletRefs.current[i];
      if (!el) continue;
      const revealed = frontierRef.current >= list[i].unlockY;
      el.style.opacity = revealed ? '1' : '0';
      el.style.transform = revealed ? 'scale(1)' : 'scale(0.3)';
    }
  };

  useEffect(() => {
    dropletsRef.current = droplets;
    applyFrontier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droplets]);

  useEffect(() => {
    let timeout: number | undefined;

    const measure = () => {
      const width = window.innerWidth;
      const height = document.documentElement.scrollHeight;
      setDims((prev) =>
        prev.width === width && Math.abs(prev.height - height) < 4
          ? prev
          : { width, height },
      );
    };

    const scheduleMeasure = () => {
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(measure, 150);
    };

    measure();
    window.addEventListener('resize', scheduleMeasure);

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(document.body);

    return () => {
      if (timeout) window.clearTimeout(timeout);
      window.removeEventListener('resize', scheduleMeasure);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (dims.width === 0 || dims.height === 0) return;
    const points = buildCenterline(dims.width, dims.height);
    setRibbonD(buildRibbon(points));
    setDroplets(buildDroplets(points, dims.width));
  }, [dims]);

  useEffect(() => {
    const animate = () => {
      const diff = targetRef.current - frontierRef.current;
      if (Math.abs(diff) < 0.5) {
        frontierRef.current = targetRef.current;
        applyFrontier();
        rafRef.current = null;
        return;
      }

      frontierRef.current += diff * 0.08;
      applyFrontier();
      rafRef.current = requestAnimationFrame(animate);
    };

    const onScroll = () => {
      targetRef.current = clamp(
        window.scrollY + window.innerHeight,
        0,
        dims.height,
      );
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims.height]);

  return (
    <div
      className={styles.wrap}
      style={{ height: dims.height || '100%' }}
      aria-hidden="true"
    >
      <svg className={styles.canvas} width={dims.width} height={dims.height}>
        <defs>
          <filter id="brushTornA" x="-30%" y="-10%" width="160%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.01 0.035"
              numOctaves="2"
              seed="4"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="34"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="brushTornB" x="-30%" y="-10%" width="160%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.018 0.05"
              numOctaves="2"
              seed="17"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="20"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <clipPath id="revealClip" clipPathUnits="userSpaceOnUse">
            <rect ref={clipRectRef} x={-2000} y={0} width={dims.width + 4000} height={0} />
          </clipPath>
        </defs>

        <g clipPath="url(#revealClip)">
          <g filter="url(#brushTornA)">
            <path d={ribbonD} className={styles.line} />
          </g>
        </g>

        {droplets.map((droplet, index) => (
          <circle
            key={index}
            ref={(el) => {
              dropletRefs.current[index] = el;
            }}
            cx={droplet.cx}
            cy={droplet.cy}
            r={droplet.r}
            filter={`url(#${droplet.filterId})`}
            className={styles.droplet}
            style={{
              opacity: 0,
              transform: 'scale(0.3)',
              transformOrigin: `${droplet.cx}px ${droplet.cy}px`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}
