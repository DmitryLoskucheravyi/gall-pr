import { Link } from 'react-router-dom';

import type { Painting } from '../types/painting.types';
import LikeButton from './ui/LikeButton';
import styles from './GalleryCard.module.scss';

type Props = {
  painting: Painting;
  // Masonry contexts (gallery wall) keep the painting's natural proportions;
  // uniform grids (favorites, profile) crop to a fixed 3:4 tile.
  natural?: boolean;
};

export default function GalleryCard({ painting, natural = false }: Props) {
  return (
    <article className={styles.card}>
      <Link to={`/painting/${painting.id}`} className={styles.linkArea}>
        <img
          src={painting.cardImage}
          alt={painting.title}
          loading="lazy"
          decoding="async"
          className={natural ? styles.imageNatural : styles.image}
        />

        {!painting.isAvailable && (
          <span className={styles.soldBadge}>Продано</span>
        )}

        <div className={styles.overlay}>
          <span className={styles.titleText}>{painting.title}</span>
        </div>
      </Link>

      <LikeButton
        paintingId={painting.id}
        likesCount={painting.likesCount}
        variant="overlay"
      />
    </article>
  );
}
