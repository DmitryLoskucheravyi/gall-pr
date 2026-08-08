import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useMyUnreadSupportCount } from '../../hooks/queries/useSupport';
import { useAppSelector } from '../../store/hooks';
import styles from './SupportWidget.module.scss';

// Kept in sync with .launcher's box in SupportWidget.module.scss.
const SIZE = 48;
// Gap held from whichever side edge the launcher is docked to.
const EDGE_GAP = 16;
// Default resting spot: docked right, lifted clear of the bottom edge.
const DEFAULT_BOTTOM_GAP = 72;
// Vertical travel limits — clear of the sticky header, clear of the bottom.
const TOP_LIMIT = 72;
const BOTTOM_LIMIT = 16;
// Pointer travel that turns a press into a drag rather than a tap.
const DRAG_THRESHOLD = 5;
const STORAGE_KEY = 'support-widget-dock';

// The launcher only ever rests against the left or right screen edge — a
// drag moves it freely, then it snaps back to the nearer side on release.
type Dock = { side: 'left' | 'right'; y: number };

function clampY(y: number) {
  const max = window.innerHeight - SIZE - BOTTOM_LIMIT;
  return Math.min(Math.max(y, TOP_LIMIT), Math.max(TOP_LIMIT, max));
}

function readDock(): Dock | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Dock;
    if (parsed.side !== 'left' && parsed.side !== 'right') return null;
    if (typeof parsed.y !== 'number' || Number.isNaN(parsed.y)) return null;
    return { side: parsed.side, y: clampY(parsed.y) };
  } catch {
    return null;
  }
}

export default function SupportWidget() {
  const isAdmin = useAppSelector((state) => state.auth.user?.role === 'ADMIN');
  const navigate = useNavigate();
  const location = useLocation();

  // Same source as the header's icon on phones, so the two can't disagree.
  const unread = useMyUnreadSupportCount();
  const onSupportPage = location.pathname.startsWith('/support');
  const [dock, setDock] = useState<Dock>(
    () =>
      readDock() ?? {
        side: 'right',
        y: clampY(window.innerHeight - SIZE - DEFAULT_BOTTOM_GAP),
      },
  );
  // Live pointer-follow position, set only while a drag is in flight.
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  // A drag ends with a click event too — swallow that one so releasing the
  // button somewhere doesn't also open the chat.
  const suppressClickRef = useRef(false);

  // Keep the launcher on-screen when the viewport resizes or rotates. The
  // new object also re-renders it, so the docked x (derived from
  // innerWidth) is recomputed.
  useEffect(() => {
    const onResize = () => setDock((prev) => ({ ...prev, y: clampY(prev.y) }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Guests get the launcher too — support is the one thing on the site that
  // shouldn't wait for an account.
  if (isAdmin || onSupportPage) return null;

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

    // Snap to whichever side edge the launcher's center ended up nearer.
    const centerX = (drag?.x ?? gesture.originX) + SIZE / 2;
    const next: Dock = {
      side: centerX < window.innerWidth / 2 ? 'left' : 'right',
      y: clampY(drag?.y ?? gesture.originY),
    };
    setDock(next);
    setDrag(null);
    suppressClickRef.current = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode / storage full — position just won't persist.
    }
  };

  const dockedX =
    dock.side === 'left' ? EDGE_GAP : window.innerWidth - SIZE - EDGE_GAP;

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
        navigate('/support');
      }}
      aria-label={
        unread > 0 ? `Підтримка, ${unread} нових повідомлень` : 'Підтримка'
      }
      className={`${styles.launcher} ${drag ? styles.dragging : ''}`}
      style={{
        left: drag ? drag.x : dockedX,
        top: drag ? drag.y : dock.y,
        transition: drag ? 'none' : undefined,
      }}
    >
      {unread > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
