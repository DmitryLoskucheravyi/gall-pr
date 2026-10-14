'use client';

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useCartCount } from '../../hooks/queries/useCart';
import { CART_INCOMING } from '../../lib/flyToCart';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { stripLocale } from '../../utils/locale';
import { readStored, writeStored } from '../../utils/safeStorage';
import styles from './FloatingCart.module.scss';

// A floating way to the cart, there for as long as the cart has something in
// it — the same draggable, edge-docking launcher as SupportWidget's, on every
// screen size. It breathes with a faint glow, and every so often (and right
// after something is added) opens out into an "Order" label and folds back.

// Kept in sync with .launcher's box in FloatingCart.module.scss.
const SIZE = 52;
const EDGE_GAP = 16;
// Default spot: docked right, low on the screen — on desktop above the
// support launcher, on a phone above the "next page" prompt.
const DEFAULT_BOTTOM_GAP_WIDE = 136;
const DEFAULT_BOTTOM_GAP_NARROW = 96;
const WIDE_FROM = 1024;
const TOP_LIMIT = 72;
const BOTTOM_LIMIT = 16;
const DRAG_THRESHOLD = 5;
const STORAGE_KEY = 'cart-fab-dock';
// The label: first a moment after the launcher appears, then on this cycle.
const LABEL_FIRST_MS = 4000;
const LABEL_EVERY_MS = 45000;
const LABEL_HOLD_MS = 2600;
// Pages where the cart is already the point, or that aren't the shop.
const QUIET_PATHS = ['/cart', '/checkout', '/admin', '/login', '/register'];

type Dock = { side: 'left' | 'right'; y: number };

// How close (RGB distance, 0–441) the colour under the launcher has to be to
// its own before it switches to its inverted look.
const BLEND_DISTANCE = 70;

type Rgb = [number, number, number, number];

function parseRgb(value: string): Rgb | null {
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = '1'] = m[1].split(/[\s,/]+/).filter(Boolean);
  return [Number(r), Number(g), Number(b), Number(a)];
}

// The first painted background under a point, skipping `self` — walking up
// from the topmost element there until one has a mostly opaque colour.
function backgroundAt(x: number, y: number, self: HTMLElement): Rgb | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (self.contains(el)) continue;
    let node: Element | null = el;
    while (node) {
      const rgb = parseRgb(getComputedStyle(node).backgroundColor);
      if (rgb && rgb[3] > 0.5) return rgb;
      node = node.parentElement;
    }
    return null;
  }
  return null;
}

function clampY(y: number) {
  const max = window.innerHeight - SIZE - BOTTOM_LIMIT;
  return Math.min(Math.max(y, TOP_LIMIT), Math.max(TOP_LIMIT, max));
}

function defaultDock(): Dock {
  const gap = window.innerWidth >= WIDE_FROM ? DEFAULT_BOTTOM_GAP_WIDE : DEFAULT_BOTTOM_GAP_NARROW;
  return { side: 'right', y: clampY(window.innerHeight - SIZE - gap) };
}

function readDock(): Dock | null {
  try {
    const raw = readStored(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Dock;
    if (parsed.side !== 'left' && parsed.side !== 'right') return null;
    if (typeof parsed.y !== 'number' || Number.isNaN(parsed.y)) return null;
    return { side: parsed.side, y: clampY(parsed.y) };
  } catch {
    return null;
  }
}

export default function FloatingCart() {
  const { t } = useTranslation('cart');
  const navigate = useLocalizedNavigate();
  const pathname = usePathname();
  const count = useCartCount();

  // A painting is on its way in (flyToCart): show up now, as its landing
  // spot, rather than once the server has confirmed the count. Lapses on its
  // own if the add never goes through.
  const [incoming, setIncoming] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onIncoming = () => {
      setIncoming(true);
      clearTimeout(timer);
      timer = setTimeout(() => setIncoming(false), 4000);
    };
    window.addEventListener(CART_INCOMING, onIncoming);
    return () => {
      window.removeEventListener(CART_INCOMING, onIncoming);
      clearTimeout(timer);
    };
  }, []);

  const path = stripLocale(pathname ?? '/');
  const quiet = QUIET_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  const visible = (count > 0 || incoming) && !quiet;

  // Position depends on the viewport and localStorage, so nothing renders
  // until mount — same reasoning as SupportWidget.
  const [dock, setDock] = useState<Dock | null>(null);
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setDock(readDock() ?? defaultDock());
    const onResize = () => setDock((prev) => (prev ? { ...prev, y: clampY(prev.y) } : prev));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  // Over a background the same colour as itself (a moss band, say) the
  // launcher would all but vanish, so it swaps to its inverted look there.
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [blend, setBlend] = useState(false);
  useEffect(() => {
    if (!visible || !dock) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = buttonRef.current;
      if (!el) return;
      // The launcher's normal colour, even while it is inverted: .launcher
      // carries it as outline-color, which computes to rgb().
      const own = parseRgb(getComputedStyle(el).outlineColor);
      const r = el.getBoundingClientRect();
      const under = backgroundAt(r.left + r.width / 2, r.top + r.height / 2, el);
      if (!own || !under) {
        setBlend(false);
        return;
      }
      const d = Math.hypot(own[0] - under[0], own[1] - under[1], own[2] - under[2]);
      setBlend(d < BLEND_DISTANCE);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Sliders, theme switches and late-loading sections change what's
    // underneath without a scroll.
    const poll = window.setInterval(schedule, 1000);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.clearInterval(poll);
      cancelAnimationFrame(frame);
    };
  }, [visible, dock, drag]);
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  // The "Order" label: open briefly on a cycle, and at once when the count
  // goes up — that is the moment the reader is most likely to want it.
  const [expanded, setExpanded] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showLabel = () => {
    clearTimeout(holdTimer.current);
    setExpanded(true);
    holdTimer.current = setTimeout(() => setExpanded(false), LABEL_HOLD_MS);
  };

  useEffect(() => {
    if (!visible) return;
    const first = setTimeout(showLabel, LABEL_FIRST_MS);
    const cycle = setInterval(showLabel, LABEL_EVERY_MS);
    return () => {
      clearTimeout(first);
      clearInterval(cycle);
      clearTimeout(holdTimer.current);
    };
  }, [visible]);

  const lastCount = useRef(count);
  useEffect(() => {
    if (count > lastCount.current && visible) showLabel();
    lastCount.current = count;
  }, [count, visible]);

  if (!dock || !visible) return null;

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    suppressClickRef.current = false;
    const rect = event.currentTarget.getBoundingClientRect();
    gestureRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!gesture.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!gesture.moved) {
      // Fold the label away for the drag; it would only get in the way.
      clearTimeout(holdTimer.current);
      setExpanded(false);
    }
    gesture.moved = true;
    setDrag({ x: gesture.originX + dx, y: gesture.originY + dy });
  };

  const endGesture = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!gesture) return;
    if (!gesture.moved) {
      setDrag(null);
      return;
    }
    const centerX = (drag?.x ?? gesture.originX) + SIZE / 2;
    const next: Dock = {
      side: centerX < window.innerWidth / 2 ? 'left' : 'right',
      y: clampY(drag?.y ?? gesture.originY),
    };
    setDock(next);
    setDrag(null);
    suppressClickRef.current = true;
    writeStored(STORAGE_KEY, JSON.stringify(next));
  };

  const dockedX =
    dock.side === 'left' ? EDGE_GAP : Math.max(EDGE_GAP, window.innerWidth - SIZE - EDGE_GAP);

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        navigate('/cart');
      }}
      aria-label={t('fabAria', { count })}
      ref={buttonRef}
      className={`${styles.launcher} ${drag ? styles.dragging : ''}`}
      data-blend={blend}
      data-cart-target
      data-side={dock.side}
      data-expanded={expanded && !drag}
      style={{
        left: drag ? drag.x : dockedX,
        top: drag ? drag.y : dock.y,
        transition: drag ? 'none' : undefined,
      }}
    >
      {/* The pill grows out of the round button towards the middle of the
          screen, so the icon itself never moves. */}
      <span className={styles.pill} aria-hidden="true">
        <span className={styles.label}>{t('fabLabel')}</span>
      </span>
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M3 4h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.2L20 8H6.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="9.5" cy="19.5" r="1.2" fill="currentColor" />
          <circle cx="16.5" cy="19.5" r="1.2" fill="currentColor" />
        </svg>
        {count > 0 && <span className={styles.badge}>{count > 99 ? '99+' : count}</span>}
      </span>
    </button>
  );
}
