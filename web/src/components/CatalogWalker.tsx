import { useEffect, useRef, useState, type RefObject } from 'react';

import styles from './CatalogWalker.module.scss';

type Props = {
  gridRef: RefObject<HTMLDivElement | null>;
  count: number;
};

type Phase = 'run' | 'jump' | 'pauseDown' | 'pauseViewer';

type Pose = {
  x: number;
  y: number;
  facingLeft: boolean;
  duration: number;
  phase: Phase;
};

type CardRect = { left: number; right: number; top: number };

const RUN_SPEED = 150; // px per second
const JUMP_DURATION = 380;
const PAUSE_LOOK_DURATION = 850;
const PAUSE_CHANCE = 0.3;
const FOOT_INSET = 12;

function clamp(value: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, value));
}

export default function CatalogWalker({ gridRef, count }: Props) {
  const indexRef = useRef(0);
  const dirRef = useRef<1 | -1>(1);
  const posRef = useRef({ x: 0, y: 0 });
  const timeoutRef = useRef<number | undefined>(undefined);

  const [pose, setPose] = useState<Pose | null>(null);

  useEffect(() => {
    if (count === 0) return;

    const getCards = (): CardRect[] => {
      const grid = gridRef.current;
      if (!grid) return [];
      const gridRect = grid.getBoundingClientRect();

      return Array.from(grid.children)
        .filter((el) => !(el as HTMLElement).dataset.walker)
        .map((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          return {
            left: r.left - gridRect.left,
            right: r.right - gridRect.left,
            top: r.top - gridRect.top,
          };
        });
    };

    const goTo = (
      x: number,
      y: number,
      facingLeft: boolean,
      duration: number,
      phase: Phase,
      onArrive: () => void,
    ) => {
      posRef.current = { x, y };
      setPose({ x, y, facingLeft, duration, phase });
      timeoutRef.current = window.setTimeout(onArrive, duration);
    };

    const runAcrossCard = () => {
      const cards = getCards();
      if (cards.length === 0) return;

      const i = clamp(indexRef.current, 0, cards.length - 1);
      const dir = dirRef.current;
      const card = cards[i];
      const targetX =
        dir === 1 ? card.right - FOOT_INSET : card.left + FOOT_INSET;
      const dist = Math.abs(targetX - posRef.current.x);
      const duration = Math.max(220, (dist / RUN_SPEED) * 1000);

      goTo(targetX, card.top, dir === -1, duration, 'run', jumpToNext);
    };

    const jumpToNext = () => {
      const cards = getCards();
      if (cards.length === 0) return;

      let dir = dirRef.current;
      let targetIndex = indexRef.current + dir;
      if (targetIndex < 0 || targetIndex >= cards.length) {
        dir = (dir * -1) as 1 | -1;
        dirRef.current = dir;
        targetIndex = indexRef.current + dir;
      }
      targetIndex = clamp(targetIndex, 0, cards.length - 1);

      const card = cards[targetIndex];
      const landX = dir === 1 ? card.left + FOOT_INSET : card.right - FOOT_INSET;

      goTo(landX, card.top, dir === -1, JUMP_DURATION, 'jump', () => {
        indexRef.current = targetIndex;

        if (Math.random() < PAUSE_CHANCE) {
          pauseAndLook();
        } else {
          runAcrossCard();
        }
      });
    };

    const pauseAndLook = () => {
      setPose((prev) => (prev ? { ...prev, phase: 'pauseDown' } : prev));
      timeoutRef.current = window.setTimeout(() => {
        setPose((prev) => (prev ? { ...prev, phase: 'pauseViewer' } : prev));
        timeoutRef.current = window.setTimeout(
          runAcrossCard,
          PAUSE_LOOK_DURATION,
        );
      }, PAUSE_LOOK_DURATION);
    };

    const cards = getCards();
    if (cards.length > 0) {
      const start = cards[0];
      const x = start.left + FOOT_INSET;
      posRef.current = { x, y: start.top };
      setPose({ x, y: start.top, facingLeft: false, duration: 0, phase: 'run' });
      timeoutRef.current = window.setTimeout(runAcrossCard, 400);
    }

    return () => {
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [gridRef, count]);

  if (!pose) return null;

  const running = pose.phase === 'run';
  const jumping = pose.phase === 'jump';
  const lookClass =
    pose.phase === 'pauseDown'
      ? styles.lookDown
      : pose.phase === 'pauseViewer'
        ? styles.lookViewer
        : styles.lookForward;

  return (
    <div
      data-walker="true"
      className={styles.walker}
      style={{
        left: pose.x,
        top: pose.y,
        transitionDuration: `${pose.duration}ms, ${pose.duration}ms, 200ms`,
        transform: `translate(-50%, -100%) scaleX(${pose.facingLeft ? -1 : 1})`,
      }}
    >
      <div className={jumping ? styles.arc : styles.rest}>
        <svg viewBox="0 0 40 56" className={styles.figure}>
          <line
            x1="20"
            y1="20"
            x2="8"
            y2="30"
            className={`${styles.stroke} ${styles.armA} ${running ? '' : styles.paused}`}
          />
          <line
            x1="20"
            y1="20"
            x2="32"
            y2="30"
            className={`${styles.stroke} ${styles.armB} ${running ? '' : styles.paused}`}
          />

          <line
            x1="20"
            y1="34"
            x2="10"
            y2="50"
            className={`${styles.stroke} ${styles.legA} ${running ? '' : styles.paused}`}
          />
          <line
            x1="20"
            y1="34"
            x2="30"
            y2="50"
            className={`${styles.stroke} ${styles.legB} ${running ? '' : styles.paused}`}
          />

          <line x1="20" y1="15" x2="20" y2="34" className={styles.stroke} />

          <g className={lookClass}>
            <circle cx="20" cy="8" r="7" className={styles.stroke} />
            <circle cx="17" cy="7" r="1.1" className={styles.eye} />
            <circle cx="23" cy="7" r="1.1" className={styles.eye} />
          </g>
        </svg>
      </div>
    </div>
  );
}
