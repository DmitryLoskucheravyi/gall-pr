import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import type { Painting } from '../types/painting.types';
import Skeleton from './ui/Skeleton';
import styles from './FeaturedStack.module.scss';

function fanStyle(index: number, center: number): CSSProperties {
  const delta = index - center;

  return {
    '--offset-x': `${delta * 46}px`,
    '--offset-y': `${Math.abs(delta) * 16}px`,
    '--rotate': `${delta * 7}deg`,
    '--scale': `${1 - Math.abs(delta) * 0.04}`,
    zIndex: Math.round(100 - Math.abs(delta) * 5),
  } as CSSProperties;
}

type Props = {
  paintings: Painting[];
};

export default function FeaturedStack({ paintings }: Props) {
  const center = (paintings.length - 1) / 2;

  return (
    <div className={styles.stack}>
      {paintings.map((painting, index) => (
        <Link
          key={painting.id}
          to={`/painting/${painting.id}`}
          className={styles.photo}
          style={fanStyle(index, center)}
        >
          <img
            src={painting.cardImage}
            alt={painting.title}
            className={styles.image}
          />
          <span className={styles.caption}>{painting.title}</span>
        </Link>
      ))}
    </div>
  );
}

export function FeaturedStackSkeleton({ count = 7 }: { count?: number }) {
  const center = (count - 1) / 2;

  return (
    <div className={styles.stack}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          className={styles.photo}
          style={fanStyle(index, center)}
        />
      ))}
    </div>
  );
}
