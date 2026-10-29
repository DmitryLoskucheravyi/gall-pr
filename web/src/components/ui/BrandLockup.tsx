import BrandLogo from './BrandLogo';
import styles from './BrandLockup.module.scss';

type Props = {
  className?: string;
  // When the arrival plays. The header passes nothing and it plays at once;
  // the footer holds it until the footer is on screen, or nobody would see it.
  play?: boolean;
};

// The logo on one line: the figure from the artwork — it is the "V" — and
// the rest of the name beside it. Used in the desktop header and the footer.
//
// The lettering is the artwork's own (public/brand/logo-text.png, cut from
// the one-line wordmark), not a font that resembles it, so the two never
// drift apart. Both are masks filled with currentColor, so the logo takes the
// ink of wherever it sits: dark, light, light over the hero, cream on the
// footer.
//
// The arrival: the figure settles, then the name is written in from left to
// right behind a soft edge, as if by a pen. Reduced motion shows it at rest.
//
// Decorative inside its link, which carries the accessible name.
export default function BrandLockup({ className, play = true }: Props) {
  return (
    <span
      className={className ? `${styles.logo} ${className}` : styles.logo}
      data-play={play || undefined}
      aria-hidden="true"
    >
      <BrandLogo variant="mark" className={styles.mark} />
      <span className={styles.name} />
    </span>
  );
}
