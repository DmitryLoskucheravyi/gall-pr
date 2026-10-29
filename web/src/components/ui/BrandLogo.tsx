import type { CSSProperties } from 'react';

import styles from './BrandLogo.module.scss';

// The logo as a mask rather than an <img>: the artwork is black ink, and the
// header alone shows it dark on the light theme, light on the dark one, and
// light again over the hero footage. A mask filled with currentColor follows
// all three from the colour tokens already in place, where an image would
// need a file per colour.
//
// The files are generated from design/logo/ — grey in the original became
// partial ink, so the highlights and the fading hair survive the mask.
const VARIANTS = {
  // figure + "iktorummart" on one line: header, cookie banner
  wordmark: { src: '/brand/logo-wordmark.png', width: 292, height: 109 },
  // figure above "iktorumm / art": footer
  stacked: { src: '/brand/logo-stacked.png', width: 178, height: 157 },
  // figure + "iktorumm / art" beside it: the mobile menu
  lockup: { src: '/brand/logo-lockup.png', width: 206, height: 89 },
  // the figure alone
  mark: { src: '/brand/logo-mark.png', width: 361, height: 321 },
} as const;

export type BrandLogoVariant = keyof typeof VARIANTS;

type Props = {
  variant: BrandLogoVariant;
  // Rendered height in px; the width follows the artwork's proportions.
  // Leave it out to size the logo from CSS (className) — for a height that
  // changes with the breakpoint.
  height?: number;
  className?: string;
};

export default function BrandLogo({ variant, height, className }: Props) {
  const { src, width: w, height: h } = VARIANTS[variant];

  return (
    <span
      role="img"
      aria-label="Viktorumm art"
      className={className ? `${styles.logo} ${className}` : styles.logo}
      style={
        {
          '--logo-src': `url(${src})`,
          ...(height ? { height: `${height}px` } : {}),
          aspectRatio: `${w} / ${h}`,
        } as CSSProperties
      }
    />
  );
}
