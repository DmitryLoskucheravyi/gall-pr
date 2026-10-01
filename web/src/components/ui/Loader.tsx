import styles from './Loader.module.scss';

type LoaderProps = {
  /** Read by screen readers; the ring itself is decorative. */
  label: string;
  size?: 'sm' | 'md';
};

// A spinner, for waits that have no shape to skeleton: a route that hasn't
// arrived yet, or a page of the catalogue being swapped for the next one.
// Where the layout is known in advance, a skeleton is still the better
// placeholder — this is for everything else.
export default function Loader({ label, size = 'md' }: LoaderProps) {
  return (
    <span className={styles.loader} data-size={size} role="status">
      <span className={styles.ring} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </span>
  );
}
