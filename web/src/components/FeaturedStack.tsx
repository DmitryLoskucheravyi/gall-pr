import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import type { Painting } from '../types/painting.types';
import { useCoarsePointer } from '../hooks/useCoarsePointer';
import { useInView } from '../hooks/useInView';
import LikeButton from './ui/LikeButton';
import Skeleton from './ui/Skeleton';
import styles from './FeaturedStack.module.scss';
import { cdnImage } from '../utils/imageUrl';

const BASE_ROTATE = -22;
const SPREAD_X = 58;

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
  // Touch devices never fire hover, so the fanned-stack transform (which
  // relies on hoveredIndex) would leave every card but the front one
  // permanently hidden. Skip the inline transform there and let the
  // stylesheet's (hover: none) rules render a plain scrollable strip.
  const isCoarsePointer = useCoarsePointer();
  // Slide the cards in from the right once the strip scrolls into view.
  const { ref, inView } = useInView<HTMLDivElement>(0.1);

  return (
    <div
      ref={ref}
      className={`${styles.stack} ${inView ? styles.revealed : ''}`}
    >
      {paintings.map((painting, index) => (
        <div
          key={painting.id}
          className={`${styles.photo} ${
            hoveredIndex === index ? styles.active : ''
          }`}
          style={{
            // `--i` drives the staggered slide-in reveal (see .scss). It lives
            // in `translate`, kept separate from the fan's `transform` so the
            // two never fight.
            ['--i' as string]: index,
            ...(isCoarsePointer
              ? {}
              : photoStyle(index, hoveredIndex, paintings.length)),
          }}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <Link to={`/painting/${painting.id}`} className={styles.imageLink}>
            <img
              src={cdnImage(painting.cardImage, 900)}
              alt={painting.title}
              loading="lazy"
              decoding="async"
              className={styles.image}
            />
            <span className={styles.caption}>{painting.title}</span>
          </Link>

          <LikeButton
            paintingId={painting.id}
            likesCount={painting.likesCount}
            variant="overlay"
            hoverReveal
          />
        </div>
      ))}
    </div>
  );
}

export function FeaturedStackSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div className={`${styles.stack} ${styles.revealed}`}>
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
