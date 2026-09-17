import type { ReactNode } from 'react';

import styles from './Checkbox.module.scss';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  name?: string;
};

export default function Checkbox({
  checked,
  onChange,
  children,
  disabled = false,
  className,
  name,
}: Props) {
  return (
    <label
      className={`${styles.label} ${disabled ? styles.disabled : ''} ${className ?? ''}`}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={styles.input}
      />
      <span className={styles.box}>
        <svg viewBox="0 0 24 24" fill="none" className={styles.check} aria-hidden="true">
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={styles.text}>{children}</span>
    </label>
  );
}
