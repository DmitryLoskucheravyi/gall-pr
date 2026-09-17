import type { CSSProperties } from 'react';

import styles from './Skeleton.module.scss';

type Props = {
  className?: string;
  style?: CSSProperties;
};

export default function Skeleton({ className, style }: Props) {
  return (
    <div
      className={`${styles.skeleton} ${className ?? ''}`}
      style={style}
      aria-hidden="true"
    />
  );
}
