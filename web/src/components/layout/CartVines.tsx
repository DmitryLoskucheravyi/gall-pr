'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { useCartCount } from '../../hooks/queries/useCart';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import styles from './CartVines.module.scss';

// Two branches that now and then grow up around the cart icon, put out their
// leaves, hold a moment and draw back. Now and then on purpose: the first
// time a few seconds after arrival, after that at a random 40–80 s, and every
// time something is added to the cart — the one moment it is a small reward
// rather than decoration.
//
// Drawn over the 34px icon box and overflowing it; never takes a click.
const FIRST_MS = 6_000;
const MIN_GAP_MS = 40_000;
const MAX_GAP_MS = 80_000;
const SHOWN_MS = 5_200; // grow + hold; the retreat is the CSS transition

// Leaves: where each sits on its branch, which way it points, and when it
// opens relative to the branch reaching it.
const LEAVES = [
  { x: -6, y: 30, r: -150, d: 0.35 },
  { x: -9, y: 17, r: 160, d: 0.55 },
  { x: -3, y: 6, r: -130, d: 0.75 },
  { x: 9, y: -4, r: -95, d: 0.95 },
  { x: 20, y: -7, r: -40, d: 1.1 },
  { x: 38, y: 31, r: -75, d: 0.45 },
  { x: 39, y: 19, r: -105, d: 0.7 },
  { x: 35, y: 7, r: -70, d: 0.9 },
  { x: 38, y: -5, r: -120, d: 1.05 },
] as const;

const LEAF = 'M0 0 C 2.5 -3.2, 7.5 -3.4, 10 0 C 7.5 3.4, 2.5 3.2, 0 0 Z';

export default function CartVines() {
  const reduced = useReducedMotion();
  const count = useCartCount();
  const [grown, setGrown] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);
  const lastCount = useRef(count);
  // The cart query answering on page load also raises the count from zero;
  // that is the cart arriving, not something being added.
  const mountedAt = useRef(0);

  const grow = () => {
    window.clearTimeout(hideTimer.current);
    setGrown(true);
    hideTimer.current = window.setTimeout(() => setGrown(false), SHOWN_MS);
  };

  // The idle schedule.
  useEffect(() => {
    if (reduced) return;

    let timer = window.setTimeout(function tick() {
      // Not while the tab is in the background, where nobody would see it.
      if (document.visibilityState === 'visible') grow();
      timer = window.setTimeout(
        tick,
        MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS),
      );
    }, FIRST_MS);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hideTimer.current);
    };
  }, [reduced]);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  // Something was added.
  useEffect(() => {
    const settled = Date.now() - mountedAt.current > 2_500;
    if (!reduced && settled && count > lastCount.current) grow();
    lastCount.current = count;
  }, [count, reduced]);

  if (reduced) return null;

  return (
    <svg
      className={styles.vines}
      viewBox="-18 -16 70 66"
      aria-hidden="true"
      data-grown={grown || undefined}
    >
      <path
        className={styles.branch}
        pathLength={1}
        d="M-4 42 C -12 32, -12 22, -6 12 S 6 -6, 24 -8"
      />
      <path
        className={styles.branch}
        pathLength={1}
        style={{ '--d': '0.12s' } as CSSProperties}
        d="M34 42 C 40 33, 41 22, 37 12 S 33 2, 38 -5"
      />
      {LEAVES.map((leaf, index) => (
        // Placed by the group, opened by the path: the leaf scales from its
        // stem at (0, 0), which only holds if the two transforms are apart.
        <g
          key={index}
          transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.r})`}
        >
          <path
            className={styles.leaf}
            d={LEAF}
            style={{ '--d': `${leaf.d}s` } as CSSProperties}
          />
        </g>
      ))}
    </svg>
  );
}
