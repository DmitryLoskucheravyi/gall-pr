import type { ReactNode } from 'react';

import styles from './Radio.module.scss';

type Props = {
  checked: boolean;
  onChange: () => void;
  name: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
};

export default function Radio({
  checked,
  onChange,
  name,
  children,
  disabled = false,
  className,
}: Props) {
  return (
    <label
      className={`${styles.label} ${disabled ? styles.disabled : ''} ${className ?? ''}`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className={styles.input}
      />
      <span className={styles.box}>
        <span className={styles.dot} />
      </span>
      <span className={styles.text}>{children}</span>
    </label>
  );
}
