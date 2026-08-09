import { useEffect, useRef, useState } from 'react';

import { cdnImage } from '../utils/imageUrl';
import styles from './InteriorCarousel.module.scss';

// How long each photo holds on its own. Long enough to take a room in, short
// enough that the last one isn't a wait.
const SLIDE_MS = 4000;

// And how long it holds when you picked it yourself. Choosing a photo is
// asking for a longer look at that one, so the bar simply fills more slowly
// and the sequence carries on afterwards at its normal pace.
//
// This replaced pausing on hover, which read as the carousel breaking: the
// bars can only be clicked with the pointer over them, so a click left it
// paused until the cursor wandered off, and nothing said why.
const HELD_SLIDE_MS = 14000;

type Props = {
  images: string[];
};

// The work seen hanging in a room, as an auto-advancing sequence with a
// progress bar per photo — one fills while its photo is up, then the next
// takes over.
//
// The bars are the whole reason this can advance on its own: a carousel that
// moves without warning is one that moves just as you started looking. Here
// you can see the current photo running out, how many are left, and you can
// jump to any of them.
export default function InteriorCarousel({ images }: Props) {
  const [active, setActive] = useState(0);
  // True while showing a photo the visitor chose, which is what buys it the
  // longer hold. Cleared as soon as the sequence moves on by itself.
  const [held, setHeld] = useState(false);
  // Bumped on every manual jump so the active bar's fill restarts from zero —
  // without it React reuses the element and the animation carries on from
  // wherever it had got to.
  const [runId, setRunId] = useState(0);

  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
  }, []);

  const holdMs = held ? HELD_SLIDE_MS : SLIDE_MS;

  useEffect(() => {
    // Someone who asked for less motion gets the photos and the controls, but
    // nothing that moves on its own.
    if (reducedMotion.current || images.length < 2) return;

    const timer = window.setTimeout(() => {
      setActive((current) => (current + 1) % images.length);
      setHeld(false);
      setRunId((id) => id + 1);
    }, holdMs);

    return () => window.clearTimeout(timer);
  }, [active, runId, holdMs, images.length]);

  const goTo = (index: number) => {
    setActive(index);
    setHeld(true);
    setRunId((id) => id + 1);
  };

  if (images.length === 0) return null;

  return (
    <div className={styles.carousel}>
      <div className={styles.bars}>
        {images.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => goTo(index)}
            className={styles.bar}
            aria-label={`Фото ${index + 1} з ${images.length}`}
            aria-current={index === active ? 'true' : undefined}
          >
            <span
              // Keyed on runId so a jump remounts the fill and the animation
              // starts over rather than resuming mid-way.
              key={index === active ? runId : 'idle'}
              className={[
                styles.barFill,
                index < active ? styles.barFilled : '',
                index === active ? styles.barActive : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                index === active
                  ? { animationDuration: `${holdMs}ms` }
                  : undefined
              }
            />
          </button>
        ))}
      </div>

      <div className={styles.frame}>
        {images.map((url, index) => (
          <img
            key={url}
            src={cdnImage(url, 1400)}
            alt={index === active ? 'Картина в інтер’єрі' : ''}
            aria-hidden={index === active ? undefined : 'true'}
            // All of them are stacked and cross-faded rather than swapped, so
            // the next photo is already decoded when its turn comes and the
            // transition doesn't stall on a fetch.
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className={`${styles.photo} ${
              index === active ? styles.visible : ''
            }`}
          />
        ))}
      </div>
    </div>
  );
}
