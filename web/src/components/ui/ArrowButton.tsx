import type { ButtonHTMLAttributes } from 'react';

import styles from './ArrowButton.module.scss';

// The one previous/next control on the site — the slider rows, the ring of
// works on the homepage, a painting's photos and its lightbox, pagination.
//
// Drawn in the same hand as the branches that grow behind the catalogue
// (ui/GrowingBranches): a thin, slightly wandering stem whose head is two
// twigs forking back from the tip, with a small sprig budding off midway.
// No ring, no disc — just ink.
//
// It is drawn in, not switched on: the stroke grows along its length when the
// button first appears, and again from the root every time the pointer
// arrives, the stem first, then the twigs, then the sprig, while the whole
// line reaches a little further in the direction it points. A press nudges it
// on.
//
// Colours and size are custom properties, so each place sets its own palette
// without restyling the mechanism:
//   --arrow-size (height; the width follows), --arrow-fg, --arrow-accent,
//   --arrow-fill, --arrow-fill-hover

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  direction: 'prev' | 'next';
  /** Required: the button has no visible text. */
  'aria-label': string;
};

export default function ArrowButton({
  direction,
  className,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`${styles.arrow} ${className ?? ''}`}
      data-direction={direction}
      {...rest}
    >
      <svg className={styles.ink} viewBox="0 0 64 28" aria-hidden="true">
        {/* The stem: a long breath of a line, not a ruler stroke. */}
        <path
          className={styles.stem}
          pathLength={1}
          d="M3 15.5c7-2.6 13.5-.4 20.5-1.6 8.2-1.4 13.8 1.6 21.8.2 5.4-.9 9.6-.6 14.2-.1"
        />
        {/* The head: two twigs forking back from the tip, uneven, the
            upper one a touch longer, each ending in a curl. */}
        <path
          className={styles.twig}
          pathLength={1}
          d="M59.5 14c-3.4-2-6.6-4.8-8.4-8.4-.5-1-1.5-1.4-2.3-.9"
        />
        <path
          className={`${styles.twig} ${styles.twigLow}`}
          pathLength={1}
          d="M59.5 14c-3.1 1.8-5.8 4.4-7.3 7.6-.4.9-1.3 1.2-2 .8"
        />
        {/* A sprig budding off the stem, with its one leaf. */}
        <path
          className={styles.sprig}
          pathLength={1}
          d="M27.5 13.9c1.6-2.8 3.9-4.9 6.9-6.1m-3.2 1.3c.4-1.9 1.8-3 3.6-3.3-.2 1.9-1.6 3.1-3.6 3.3"
        />
      </svg>
    </button>
  );
}
