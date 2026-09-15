import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import styles from './ContinuePrompt.module.scss';

type Props = {
  // Where scrolling past the bottom of this page leads, if anywhere — see
  // useScrollContinue. Renders nothing when there's nowhere to go.
  nextPath?: string;
  progress: number;
};

// How far into the gesture before the prompt reveals itself. Small enough
// that real intent to keep scrolling crosses it almost at once, large
// enough that the odd bit of momentum right at the bottom of the page
// doesn't flash it up for a frame and gone again.
const REVEAL_AT = 0.05;

// A phone-only companion to Footer's own continue row — see
// ContinuePrompt.module.scss for why. It doesn't sit on screen the whole
// time the reader is near the bottom; it rises up, once, the moment they
// actually push past it, with a touch of haptic feedback to mark the
// moment — the sort of thing a native "you've reached the end, keep going"
// gesture would give for free and the web has to ask for by hand.
export default function ContinuePrompt({ nextPath, progress }: Props) {
  const [revealed, setRevealed] = useState(false);
  const wasRevealed = useRef(false);

  useEffect(() => {
    const next = progress >= REVEAL_AT;
    if (next && !wasRevealed.current && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
    wasRevealed.current = next;
    setRevealed(next);
  }, [progress]);

  if (!nextPath) return null;

  return (
    <Link
      to={nextPath}
      className={styles.prompt}
      data-revealed={revealed}
      style={{ '--progress': progress } as CSSProperties}
    >
      <span className={styles.label}>Далі</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} />
      </span>
      <svg
        className={styles.arrow}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M9 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
