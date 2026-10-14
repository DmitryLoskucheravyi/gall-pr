'use client';

import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './StarRating.module.scss';

// One to five stars, drawn in the site's hairline rather than as filled
// emoji. Two modes: read-only (a review card) and input (the review form),
// where hovering previews the score and a star inks itself in when chosen.
//
// As an input it is a radio group, so a keyboard moves through it with the
// arrows and a screen reader says "3 of 5" rather than "button, button…".

const STAR =
  'M12 3.3c.9 1.9 1.7 3.8 2.6 5.6 2 .3 4.1.5 6.1.8-1.5 1.4-3 2.8-4.5 4.3.4 2 .8 4 1.2 6-1.8-1-3.6-2-5.4-3-1.8 1-3.6 2-5.4 3 .4-2 .8-4 1.2-6-1.5-1.5-3-2.9-4.5-4.3 2-.3 4.1-.5 6.1-.8.9-1.8 1.7-3.7 2.6-5.6z';

type Props = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  /** Names the group when it is an input. */
  label?: string;
  className?: string;
};

export default function StarRating({ value, onChange, size = 18, label, className }: Props) {
  const { t } = useTranslation('common');
  const [hover, setHover] = useState(0);
  const interactive = !!onChange;
  const shown = hover || value;

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onChange) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(Math.max(1, (value || 1) - 1));
    } else if (/^[1-5]$/.test(event.key)) {
      onChange(Number(event.key));
    }
  };

  const stars = [1, 2, 3, 4, 5].map((n) => {
    const on = n <= shown;
    const svg = (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={styles.star} data-on={on || undefined}>
        <path className={styles.fill} d={STAR} />
        <path className={styles.line} d={STAR} pathLength={1} />
      </svg>
    );

    if (!interactive) return <span key={n}>{svg}</span>;

    return (
      <button
        key={n}
        type="button"
        role="radio"
        aria-checked={n === value}
        aria-label={t('stars', { count: n })}
        tabIndex={n === (value || 1) ? 0 : -1}
        className={styles.button}
        onClick={() => onChange(n)}
        onPointerEnter={() => setHover(n)}
        onPointerLeave={() => setHover(0)}
        // Each star inks in a beat after the one before, when chosen.
        style={{ animationDelay: `${(n - 1) * 0.06}s` }}
      >
        {svg}
      </button>
    );
  });

  return interactive ? (
    <div
      role="radiogroup"
      aria-label={label}
      className={`${styles.rating} ${styles.input} ${className ?? ''}`}
      onKeyDown={onKey}
    >
      {stars}
    </div>
  ) : (
    <div
      className={`${styles.rating} ${className ?? ''}`}
      role="img"
      aria-label={t('starsOf', { value, max: 5 })}
    >
      {stars}
    </div>
  );
}
