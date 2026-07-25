import { Link } from 'react-router-dom';

import type { Painting } from '../types/painting.types';
import LikeButton from './ui/LikeButton';
import styles from './GalleryCard.module.scss';

type Props = {
  painting: Painting;
};

export default function GalleryCard({ painting }: Props) {
  return (
    <div className={styles.card}>
      <Link to={`/painting/${painting.id}`} className={styles.linkArea}>
        <img
          src={painting.cardImage}
          alt={painting.title}
          className={styles.image}
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
        initialLikesCount={painting.likesCount}
        variant="overlay"
      />
    </div>
  );
}
