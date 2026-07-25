import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import type { Painting } from '../types/painting.types';
import LikeButton from './ui/LikeButton';
import Skeleton from './ui/Skeleton';
import styles from './FeaturedStack.module.scss';

const BASE_ROTATE = -22;
const SPREAD_X = 46;

function photoStyle(
  index: number,
  hoveredIndex: number | null,
  total: number,
): CSSProperties {
  const baseZ = total - index;

  if (hoveredIndex === null) {
    return {
      transform: `rotateY(${BASE_ROTATE}deg)`,
      zIndex: baseZ,
    };
  }

  if (index === hoveredIndex) {
    return {
      transform: 'rotateY(0deg) translateY(-16px) scale(1.16)',
      zIndex: 999,
    };
  }

  const away = index < hoveredIndex ? -SPREAD_X : SPREAD_X;

  return {
    transform: `translateX(${away}px) rotateY(${BASE_ROTATE}deg)`,
    zIndex: baseZ,
  };
}

type Props = {
  paintings: Painting[];
};

export default function FeaturedStack({ paintings }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className={styles.stack}>
      {paintings.map((painting, index) => (
        <div
          key={painting.id}
          className={`${styles.photo} ${
            hoveredIndex === index ? styles.active : ''
          }`}
          style={photoStyle(index, hoveredIndex, paintings.length)}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <Link to={`/painting/${painting.id}`} className={styles.imageLink}>
            <img
              src={painting.cardImage}
              alt={painting.title}
              className={styles.image}
            />
            <span className={styles.caption}>{painting.title}</span>
          </Link>

          <LikeButton
            paintingId={painting.id}
            initialLikesCount={painting.likesCount}
            variant="overlay"
          />
        </div>
      ))}
    </div>
  );
}

export function FeaturedStackSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div className={styles.stack}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          className={styles.photo}
          style={{
            transform: `rotateY(${BASE_ROTATE}deg)`,
            zIndex: count - index,
          }}
        />
      ))}
    </div>
  );
}
