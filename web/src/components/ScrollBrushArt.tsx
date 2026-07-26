import { useEffect, useRef, useState } from 'react';

import styles from './ScrollBrushArt.module.scss';

type Segment = {
  d: string;
  startY: number;
  endY: number;
  width: number;
  filterId: 'brushTornA' | 'brushTornB';
};

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

// Deterministic pseudo-random, keyed by index, so segment widths/gaps
// stay stable across re-renders instead of reshuffling every scroll tick.
function rand(seed: number) {
  const x = Math.sin(seed * 999.7) * 10000;
  return x - Math.floor(x);
}

function buildWavePoints(width: number, height: number) {
  const count = 16;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= count; i++) {
    const y = (height * i) / count;
    const wave =
      0.5 +
      Math.sin(i * 0.9) * 0.42 +
      Math.sin(i * 2.6 + 1.3) * 0.22;
    points.push({ x: width * clamp(wave, -0.15, 1.15), y });
  }

  return points;
}

// A flowing wave from the very top of the document to the very bottom,
// split into short pieces so each can get its own brush-like width. Two
// overlaid sine waves (a wide slow one plus a faster, sharper one) mean
// it drifts gently most of the time but occasionally swings hard and
// quickly from side to side where the two happen to line up.
function buildSegments(points: { x: number; y: number }[]): Segment[] {
  const segments: Segment[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midY = (p0.y + p1.y) / 2;
    const d = `M ${p0.x} ${p0.y} C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;

    segments.push({
      d,
      startY: p0.y,
      endY: p1.y,
      width: 65 + rand(i + 1) * 140,
      filterId: i % 2 === 0 ? 'brushTornA' : 'brushTornB',
    });
  }

  return segments;
}

// A handful of paint droplets flung off near some of the wave's turning
// points — they pop in permanently once the line has been drawn past
// that point, like real splatter left behind by the brush.
function buildDroplets(
  points: { x: number; y: number }[],
  width: number,
): Droplet[] {
  const droplets: Droplet[] = [];

  points.forEach((point, i) => {
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
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const frontierRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [segments, setSegments] = useState<Segment[]>([]);
  const [droplets, setDroplets] = useState<Droplet[]>([]);
  const [lengths, setLengths] = useState<number[]>([]);
  const [frontierY, setFrontierY] = useState(0);

  useEffect(() => {
    const measure = () => {
      const width = window.innerWidth;
      const height = document.documentElement.scrollHeight;
      setDims((prev) =>
        prev.width === width && Math.abs(prev.height - height) < 4
          ? prev
          : { width, height },
      );
    };

    measure();
    window.addEventListener('resize', measure);

    const observer = new ResizeObserver(measure);
    observer.observe(document.body);

    return () => {
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (dims.width === 0 || dims.height === 0) return;
    const points = buildWavePoints(dims.width, dims.height);
    setLengths([]);
    setSegments(buildSegments(points));
    setDroplets(buildDroplets(points, dims.width));
  }, [dims]);

  useEffect(() => {
    if (segments.length === 0) return;

    const id = requestAnimationFrame(() => {
      setLengths(
        pathRefs.current.map((path) => path?.getTotalLength() ?? 0),
      );
    });

    return () => cancelAnimationFrame(id);
  }, [segments]);

  useEffect(() => {
    const animate = () => {
      const diff = targetRef.current - frontierRef.current;
      if (Math.abs(diff) < 0.5) {
        frontierRef.current = targetRef.current;
        setFrontierY(frontierRef.current);
        rafRef.current = null;
        return;
      }

      frontierRef.current += diff * 0.08;
      setFrontierY(frontierRef.current);
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
  }, [dims.height]);

  const measured = lengths.length === segments.length && segments.length > 0;

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
              numOctaves="3"
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
              numOctaves="3"
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
        </defs>

        {segments.map((segment, index) => {
          const length = lengths[index] ?? 0;
          const local = clamp(
            (frontierY - segment.startY) / (segment.endY - segment.startY),
            0,
            1,
          );
          const offset = length * (1 - local);

          return (
            <path
              key={index}
              ref={(el) => {
                pathRefs.current[index] = el;
              }}
              d={segment.d}
              filter={`url(#${segment.filterId})`}
              className={styles.line}
              style={{
                opacity: measured ? 1 : 0,
                strokeWidth: segment.width,
                strokeDasharray: length,
                strokeDashoffset: measured ? offset : length,
              }}
            />
          );
        })}

        {measured &&
          droplets.map((droplet, index) => (
            <circle
              key={index}
              cx={droplet.cx}
              cy={droplet.cy}
              r={droplet.r}
              filter={`url(#${droplet.filterId})`}
              className={styles.droplet}
              style={{
                opacity: frontierY >= droplet.unlockY ? 1 : 0,
                transform:
                  frontierY >= droplet.unlockY ? 'scale(1)' : 'scale(0.3)',
                transformOrigin: `${droplet.cx}px ${droplet.cy}px`,
              }}
            />
          ))}
      </svg>
    </div>
  );
}
