import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';

import styles from './CatalogWalker.module.scss';

type Props = {
  gridRef: RefObject<HTMLDivElement | null>;
  count: number;
};

type Phase =
  | 'run'
  | 'jump'
  | 'pauseDown'
  | 'pauseViewer'
  | 'flee'
  | 'bigJump'
  | 'fall'
  | 'footerWalk'
  | 'sit'
  | 'lookUp'
  | 'footerFlee'
  | 'hidden'
  | 'wave'
  | 'turn'
  | 'tryJump';

type Pose = {
  x: number;
  y: number;
  facingLeft: boolean;
  duration: number;
  phase: Phase;
  strideMs: number;
};

type Mode =
  | 'running'
  | 'hoverPause'
  | 'fleeing'
  | 'edgeJump'
  | 'falling'
  | 'footerIdle'
  | 'footerFlee'
  | 'hidden';

type CardRect = { left: number; right: number; top: number };

type Controller = {
  startFlee: () => void;
  startFooterFlee: () => void;
  resume: () => void;
};

const RUN_SPEED = 95;
const FLEE_SPEED = 300;
const FOOTER_SPEED_MIN = 30;
const FOOTER_SPEED_MAX = 85;
const JUMP_DURATION = 380;
const BIG_JUMP_DURATION = 650;
const FALL_DURATION = 750;
const PAUSE_LOOK_DURATION = 850;
const FOOTER_PAUSE_DURATION = 1100;
const PAUSE_CHANCE = 0.3;
const FAIL_CHANCE = 0.4;
const FOOT_INSET = 12;
const OFFSCREEN_MARGIN = 90;
const TURN_DURATION = 320;
const TRY_JUMP_DURATION = 900;
// Reference stride length: at RUN_SPEED the limbs swing this fast. Any
// other actual speed (slow footer shuffle, panicked flee) scales this
// duration proportionally, so faster movement always reads as faster
// steps and slower movement always reads as slower ones.
const BASE_STRIDE_MS = 280;
const STRIDE_MIN_MS = 90;
const STRIDE_MAX_MS = 900;

function clamp(value: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, value));
}

function getTopRowCards(grid: HTMLDivElement): CardRect[] {
  const gridRect = grid.getBoundingClientRect();
  const all = Array.from(grid.children)
    .filter((el) => !(el as HTMLElement).dataset.walker)
    .map((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      return {
        left: r.left - gridRect.left,
        right: r.right - gridRect.left,
        top: r.top - gridRect.top,
      };
    });

  if (all.length === 0) return [];
  const minTop = Math.min(...all.map((c) => c.top));
  return all.filter((c) => Math.abs(c.top - minTop) < 2);
}

export default function CatalogWalker({ gridRef, count }: Props) {
  const walkerRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef<Mode>('running');
  const modeBeforeHoverRef = useRef<Mode>('running');
  const indexRef = useRef(0);
  const dirRef = useRef<1 | -1>(1);
  const posRef = useRef({ x: 0, y: 0 });
  const phaseRef = useRef<Phase>('run');
  const timeoutRef = useRef<number | undefined>(undefined);
  const controllerRef = useRef<Controller | null>(null);

  const [pose, setPose] = useState<Pose | null>(null);

  useEffect(() => {
    if (count === 0) return;

    const clearPending = () => {
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    };

    const goTo = (
      x: number,
      y: number,
      facingLeft: boolean,
      duration: number,
      phase: Phase,
      onArrive?: () => void,
    ) => {
      // Derive how fast this particular move actually is and scale the
      // limb-swing duration to match, instead of every move animating
      // its stride at the same fixed pace regardless of real speed.
      const dist = Math.hypot(x - posRef.current.x, y - posRef.current.y);
      const speed = duration > 0 ? (dist / duration) * 1000 : RUN_SPEED;
      const strideMs = clamp(
        BASE_STRIDE_MS * (RUN_SPEED / Math.max(speed, 1)),
        STRIDE_MIN_MS,
        STRIDE_MAX_MS,
      );

      posRef.current = { x, y };
      phaseRef.current = phase;
      setPose({ x, y, facingLeft, duration, phase, strideMs });
      if (onArrive) {
        timeoutRef.current = window.setTimeout(onArrive, duration);
      }
    };

    const setPhaseOnly = (phase: Phase) => {
      phaseRef.current = phase;
      setPose((prev) => (prev ? { ...prev, phase } : prev));
    };

    // ---- normal running on the top row ----
    const runAcrossCard = () => {
      if (modeRef.current !== 'running') return;
      const grid = gridRef.current;
      if (!grid) return;
      const cards = getTopRowCards(grid);
      if (cards.length === 0) return;

      const i = clamp(indexRef.current, 0, cards.length - 1);
      const dir = dirRef.current;
      const card = cards[i];
      const targetX =
        dir === 1 ? card.right - FOOT_INSET : card.left + FOOT_INSET;
      const dist = Math.abs(targetX - posRef.current.x);
      const duration = Math.max(220, (dist / RUN_SPEED) * 1000);

      goTo(targetX, card.top, dir === -1, duration, 'run', jumpToNextCard);
    };

    const jumpToNextCard = () => {
      if (modeRef.current !== 'running') return;
      const grid = gridRef.current;
      if (!grid) return;
      const cards = getTopRowCards(grid);
      if (cards.length === 0) return;

      const dir = dirRef.current;
      const targetIndex = indexRef.current + dir;

      if (targetIndex < 0 || targetIndex >= cards.length) {
        // Hit the end of the row — stop, pivot to face the other way,
        // hold for a beat, then run back across this same card. Flipping
        // instantly while still moving at full speed is what read as a
        // teleport before.
        const newDir = (dir * -1) as 1 | -1;
        dirRef.current = newDir;
        phaseRef.current = 'turn';
        setPose((prev) =>
          prev
            ? { ...prev, facingLeft: newDir === -1, duration: 0, phase: 'turn' }
            : prev,
        );
        timeoutRef.current = window.setTimeout(() => {
          if (modeRef.current === 'running') runAcrossCard();
        }, TURN_DURATION);
        return;
      }

      const card = cards[targetIndex];
      const landX = dir === 1 ? card.left + FOOT_INSET : card.right - FOOT_INSET;

      goTo(landX, card.top, dir === -1, JUMP_DURATION, 'jump', () => {
        indexRef.current = targetIndex;
        if (modeRef.current !== 'running') return;

        if (Math.random() < PAUSE_CHANCE) {
          pauseAndLook();
        } else {
          runAcrossCard();
        }
      });
    };

    const pauseAndLook = () => {
      if (modeRef.current !== 'running') return;
      setPhaseOnly('pauseDown');
      timeoutRef.current = window.setTimeout(() => {
        if (modeRef.current !== 'running') return;
        setPhaseOnly('pauseViewer');
        timeoutRef.current = window.setTimeout(() => {
          if (modeRef.current === 'running') runAcrossCard();
        }, PAUSE_LOOK_DURATION);
      }, PAUSE_LOOK_DURATION);
    };

    // ---- fleeing after a click ----
    const startFlee = () => {
      const grid = gridRef.current;
      if (!grid) return;
      const cards = getTopRowCards(grid);
      if (cards.length === 0) return;

      const gridRect = grid.getBoundingClientRect();
      const fleeDir: 1 | -1 =
        posRef.current.x < gridRect.width / 2 ? -1 : 1;
      dirRef.current = fleeDir;
      modeRef.current = 'fleeing';
      clearPending();
      fleeStep();
    };

    const fleeStep = () => {
      if (modeRef.current !== 'fleeing') return;
      const grid = gridRef.current;
      if (!grid) return;
      const cards = getTopRowCards(grid);
      if (cards.length === 0) return;

      const dir = dirRef.current;
      const edgeIndex = dir === 1 ? cards.length - 1 : 0;
      const atEdge = indexRef.current === edgeIndex;

      if (atEdge) {
        startBigJump();
        return;
      }

      const card = cards[clamp(indexRef.current, 0, cards.length - 1)];
      const targetX = dir === 1 ? card.right - FOOT_INSET : card.left + FOOT_INSET;
      const dist = Math.abs(targetX - posRef.current.x);
      const duration = Math.max(140, (dist / FLEE_SPEED) * 1000);

      goTo(targetX, card.top, dir === -1, duration, 'flee', () => {
        if (modeRef.current !== 'fleeing') return;
        const nextIndex = clamp(indexRef.current + dir, 0, cards.length - 1);
        const nextCard = cards[nextIndex];
        const landX =
          dir === 1 ? nextCard.left + FOOT_INSET : nextCard.right - FOOT_INSET;

        goTo(landX, nextCard.top, dir === -1, JUMP_DURATION * 0.7, 'flee', () => {
          indexRef.current = nextIndex;
          fleeStep();
        });
      });
    };

    // ---- the big off-screen leap ----
    const startBigJump = () => {
      const grid = gridRef.current;
      if (!grid) return;
      modeRef.current = 'edgeJump';
      clearPending();

      const dir = dirRef.current;
      const gridRect = grid.getBoundingClientRect();
      const offX =
        dir === 1 ? gridRect.width + OFFSCREEN_MARGIN : -OFFSCREEN_MARGIN;

      goTo(offX, posRef.current.y, dir === -1, BIG_JUMP_DURATION, 'bigJump', () => {
        if (Math.random() < FAIL_CHANCE) {
          startFall();
        } else {
          modeRef.current = 'hidden';
          setPhaseOnly('hidden');
        }
      });
    };

    const startFall = () => {
      modeRef.current = 'falling';
      clearPending();

      const grid = gridRef.current;
      const footer = document.querySelector('footer');
      if (!grid || !footer) return;

      const gridRect = grid.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      const landX = clamp(posRef.current.x, 40, gridRect.width - 40);
      const landY = footerRect.top - gridRect.top + 14;

      goTo(landX, landY, dirRef.current === -1, FALL_DURATION, 'fall', () => {
        modeRef.current = 'footerIdle';
        footerStep();
      });
    };

    // ---- sad slow pacing on the footer ----
    const footerStep = () => {
      if (modeRef.current !== 'footerIdle') return;
      const grid = gridRef.current;
      const footer = document.querySelector('footer');
      if (!grid || !footer) return;

      const gridRect = grid.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      const left = footerRect.left - gridRect.left + 30;
      const right = footerRect.right - gridRect.left - 30;
      const y = footerRect.top - gridRect.top + 14;

      const roll = Math.random();

      if (roll < 0.15) {
        setPhaseOnly('sit');
        timeoutRef.current = window.setTimeout(() => {
          if (modeRef.current === 'footerIdle') footerStep();
        }, FOOTER_PAUSE_DURATION);
        return;
      }

      // Looking up at the paintings he fell from is his main "mood" down
      // here, so it gets by far the largest share of the roll.
      if (roll < 0.55) {
        setPhaseOnly('lookUp');
        timeoutRef.current = window.setTimeout(() => {
          if (modeRef.current === 'footerIdle') footerStep();
        }, FOOTER_PAUSE_DURATION);
        return;
      }

      if (roll < 0.72) {
        // Looks up at the paintings he fell from and tries (and fails)
        // to hop back up, reaching desperately for them.
        setPhaseOnly('tryJump');
        timeoutRef.current = window.setTimeout(() => {
          if (modeRef.current === 'footerIdle') footerStep();
        }, TRY_JUMP_DURATION);
        return;
      }

      // A wander, not a metronome: pick a random distance/direction along
      // the footer (not always the far edge) at a randomized pace, so no
      // two steps look alike instead of just alternating fast/slow.
      const span = Math.max(1, right - left);
      const wanderDist = span * (0.25 + Math.random() * 0.55);
      let wanderDir = Math.random() < 0.5 ? -1 : 1;
      let targetX = clamp(posRef.current.x + wanderDir * wanderDist, left, right);

      if (Math.abs(targetX - posRef.current.x) < 20) {
        wanderDir = (wanderDir * -1) as 1 | -1;
        targetX = clamp(posRef.current.x + wanderDir * wanderDist, left, right);
      }

      const dir: 1 | -1 = targetX >= posRef.current.x ? 1 : -1;
      dirRef.current = dir;

      const speed =
        FOOTER_SPEED_MIN + Math.random() * (FOOTER_SPEED_MAX - FOOTER_SPEED_MIN);
      const duration = Math.max(
        500,
        (Math.abs(targetX - posRef.current.x) / speed) * 1000,
      );

      goTo(targetX, y, dir === -1, duration, 'footerWalk', () => {
        if (modeRef.current === 'footerIdle') footerStep();
      });
    };

    // ---- fleeing off-screen from the footer ----
    const startFooterFlee = () => {
      const grid = gridRef.current;
      if (!grid) return;
      modeRef.current = 'footerFlee';
      clearPending();

      const gridRect = grid.getBoundingClientRect();
      const dir: 1 | -1 = posRef.current.x < gridRect.width / 2 ? -1 : 1;
      dirRef.current = dir;
      const offX = dir === 1 ? gridRect.width + OFFSCREEN_MARGIN : -OFFSCREEN_MARGIN;

      goTo(offX, posRef.current.y, dir === -1, 500, 'footerFlee', () => {
        modeRef.current = 'hidden';
        setPhaseOnly('hidden');
      });
    };

    // ---- initial placement ----
    const grid = gridRef.current;
    if (grid) {
      const cards = getTopRowCards(grid);
      if (cards.length > 0) {
        const start = cards[0];
        const x = start.left + FOOT_INSET;
        posRef.current = { x, y: start.top };
        setPose({
          x,
          y: start.top,
          facingLeft: false,
          duration: 0,
          phase: 'run',
          strideMs: BASE_STRIDE_MS,
        });
        timeoutRef.current = window.setTimeout(runAcrossCard, 400);
      }
    }

    const resume = () => {
      if (modeBeforeHoverRef.current === 'running') runAcrossCard();
      else if (modeBeforeHoverRef.current === 'footerIdle') footerStep();
    };

    // Native mouseenter/mouseleave only re-fire on pointer movement, not
    // on the *element* moving out from under a stationary cursor — since
    // this character is constantly animating, that left hover state
    // getting stuck. Polling the live rect on every real mousemove works
    // regardless of who moved.
    const handleMouseMove = (event: MouseEvent) => {
      const el = walkerRef.current;
      const grid = gridRef.current;
      if (!el || !grid) return;

      const rect = el.getBoundingClientRect();
      const margin = 6;
      const inside =
        event.clientX >= rect.left - margin &&
        event.clientX <= rect.right + margin &&
        event.clientY >= rect.top - margin &&
        event.clientY <= rect.bottom + margin;

      const mode = modeRef.current;
      // Hover-wave is allowed while running/paused/looking-around, but
      // never mid-jump, mid-turn, or mid-flee — interrupting one of
      // those left state (like the pending turn-around direction flip)
      // in an inconsistent half-finished spot.
      const hoverable =
        phaseRef.current === 'run' ||
        phaseRef.current === 'footerWalk' ||
        phaseRef.current === 'pauseDown' ||
        phaseRef.current === 'pauseViewer' ||
        phaseRef.current === 'sit' ||
        phaseRef.current === 'lookUp';

      if (
        inside &&
        hoverable &&
        (mode === 'running' || mode === 'footerIdle')
      ) {
        const gridRect = grid.getBoundingClientRect();
        const x = rect.left - gridRect.left + rect.width / 2;
        const y = rect.top - gridRect.top + rect.height;

        modeBeforeHoverRef.current = mode;
        modeRef.current = 'hoverPause';
        clearPending();
        posRef.current = { x, y };
        setPose((prev) =>
          prev ? { ...prev, x, y, duration: 0, phase: 'wave' } : prev,
        );
      } else if (!inside && mode === 'hoverPause') {
        modeRef.current = modeBeforeHoverRef.current;
        resume();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    controllerRef.current = { startFlee, startFooterFlee, resume };

    return () => {
      clearPending();
      controllerRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridRef, count]);

  const handleClick = () => {
    const mode = modeRef.current;
    if (mode === 'running' || mode === 'hoverPause') {
      controllerRef.current?.startFlee();
    } else if (mode === 'footerIdle') {
      controllerRef.current?.startFooterFlee();
    }
  };

  if (!pose) return null;

  const running = pose.phase === 'run' || pose.phase === 'footerWalk';
  const fleeing = pose.phase === 'flee' || pose.phase === 'footerFlee';
  const jumping =
    pose.phase === 'jump' || pose.phase === 'bigJump' || pose.phase === 'fall';
  const sitting = pose.phase === 'sit';
  const hidden = pose.phase === 'hidden';
  const waving = pose.phase === 'wave';
  const turning = pose.phase === 'turn';
  const tryingJump = pose.phase === 'tryJump';

  const lookClass =
    pose.phase === 'pauseDown'
      ? styles.lookDown
      : pose.phase === 'pauseViewer'
        ? styles.lookViewer
        : pose.phase === 'lookUp' || tryingJump
          ? styles.lookUp
          : styles.lookForward;

  return (
    <div
      ref={walkerRef}
      data-walker="true"
      className={styles.walker}
      onClick={handleClick}
      style={
        {
          left: pose.x,
          top: pose.y,
          opacity: hidden ? 0 : 1,
          transitionDuration: `${pose.duration}ms, ${pose.duration}ms, 250ms`,
          transform: `translate(-50%, -100%) scaleX(${pose.facingLeft ? -1 : 1})`,
          '--stride-duration': `${pose.strideMs}ms`,
        } as CSSProperties
      }
    >
      <div
        className={
          jumping
            ? styles.arc
            : turning
              ? styles.turning
              : tryingJump
                ? styles.tryJumpHop
                : running
                  ? styles.bobbing
                  : styles.rest
        }
      >
        <svg viewBox="0 0 40 56" className={styles.figure}>
          {tryingJump ? (
            <>
              <line x1="20" y1="20" x2="12" y2="30" className={styles.stroke} />
              <line
                x1="20"
                y1="20"
                x2="26"
                y2="4"
                className={`${styles.stroke} ${styles.reachUp}`}
              />
            </>
          ) : !waving ? (
            <>
              <line
                x1="20"
                y1="20"
                x2="8"
                y2="30"
                className={`${styles.stroke} ${styles.armA} ${
                  running ? '' : styles.paused
                } ${fleeing ? styles.armsUp : ''}`}
              />
              <line
                x1="20"
                y1="20"
                x2="32"
                y2="30"
                className={`${styles.stroke} ${styles.armB} ${
                  running ? '' : styles.paused
                } ${fleeing ? styles.armsUp : ''}`}
              />
            </>
          ) : (
            <>
              <line x1="20" y1="20" x2="10" y2="28" className={styles.stroke} />
              <line
                x1="20"
                y1="20"
                x2="32"
                y2="8"
                className={`${styles.stroke} ${styles.wavingArm}`}
              />
            </>
          )}

          {sitting ? (
            <>
              <line x1="20" y1="34" x2="7" y2="42" className={styles.stroke} />
              <line x1="20" y1="34" x2="33" y2="42" className={styles.stroke} />
            </>
          ) : (
            <>
              <line
                x1="20"
                y1="34"
                x2="10"
                y2="50"
                className={`${styles.stroke} ${styles.legA} ${
                  running ? '' : styles.paused
                }`}
              />
              <line
                x1="20"
                y1="34"
                x2="30"
                y2="50"
                className={`${styles.stroke} ${styles.legB} ${
                  running ? '' : styles.paused
                }`}
              />
            </>
          )}

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
