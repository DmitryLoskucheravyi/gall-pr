import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from './ui/LocalizedLink';
import type { Painting } from '../types/painting.types';
import { useLocale } from '../hooks/useLocale';
import { pickLocale } from '../utils/localizedField';
import LikeButton from './ui/LikeButton';
import styles from './GalleryCard.module.scss';
import { cdnImage } from '../utils/imageUrl';
import { editionLabel } from '../utils/edition';

type Props = {
  painting: Painting;
  // Masonry contexts (gallery wall) keep the painting's natural proportions;
  // uniform grids (favorites, profile) crop to a fixed 3:4 tile.
  natural?: boolean;
};

export default function GalleryCard({ painting, natural = false }: Props) {
  const { t } = useTranslation('common');
  const locale = useLocale();
  const title = pickLocale(painting, 'title', locale);

  return (
    <article className={styles.card}>
      <Link to={`/painting/${painting.id}`} className={styles.linkArea}>
        <img
          src={cdnImage(painting.cardImage, 600)}
          alt={title}
          loading="lazy"
          decoding="async"
          className={natural ? styles.imageNatural : styles.image}
        />

        {/* Only once it's gone. While a work is still for sale, whether it's
            unique is a detail; the moment it isn't, whether another one can
            be had is the only thing the viewer wants to know. */}
        {!painting.isAvailable && (
          <div className={styles.badges}>
            <span className={styles.soldBadge}>{t('sold')}</span>
            <span
              className={`${styles.editionBadge} ${
                painting.isRepeatable ? styles.editionRepeatable : ''
              }`}
            >
              {editionLabel(painting.isRepeatable, t)}
            </span>
          </div>
        )}

        <div className={styles.overlay}>
          <span className={styles.titleText}>{title}</span>
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
