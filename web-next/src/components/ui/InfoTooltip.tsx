import styles from './InfoTooltip.module.scss';

type Props = { text: string };

export default function InfoTooltip({ text }: Props) {
  return (
    <span className={styles.wrap} tabIndex={0}>
      <svg viewBox="0 0 24 24" fill="none" className={styles.icon}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 11v5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="8" r="1" fill="currentColor" />
      </svg>
      <span className={styles.tooltip} role="tooltip">
        {text}
      </span>
    </span>
  );
}
