import { Link } from 'react-router-dom';

import type { Painting } from '../types/painting.types';
import { useAuthorName } from '../hooks/queries/useSettings';
import LikeButton from './ui/LikeButton';
import styles from './PaintingCard.module.scss';
import { cdnImage } from '../utils/imageUrl';

type Props = {
  painting: Painting;
  onBuy?: () => void;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
};

export default function PaintingCard({
  painting,
  onBuy,
  isAdmin,
  onEdit,
  onDelete,
  compact,
}: Props) {
  const authorName = useAuthorName();
  const price = Number(painting.price);

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        <Link to={`/painting/${painting.id}`} className={styles.imageLink}>
          <img
            src={cdnImage(painting.cardImage, 600)}
            alt={painting.title}
            loading="lazy"
            decoding="async"
            className={styles.image}
          />
          {!painting.isAvailable && (
            <span className={styles.soldBadge}>Продано</span>
          )}
        </Link>

        <LikeButton
          paintingId={painting.id}
          likesCount={painting.likesCount}
          variant="overlay"
          showCount={false}
        />
      </div>

      <div className={styles.body}>
        <Link to={`/painting/${painting.id}`} className={styles.title}>
          {painting.title}
        </Link>

        {!!authorName && <span className={styles.author}>{authorName}</span>}

        {!compact && painting.width && painting.height && (
          <span className={styles.size}>
            {painting.width} × {painting.height} см
          </span>
        )}

        <span className={styles.price}>{price.toLocaleString()} ₴</span>

        {!compact && (
          <div className={styles.actions}>
            <Link
              to={`/painting/${painting.id}`}
              aria-label="Детальніше"
              className={styles.detailsButton}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.buttonIcon}>
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
              <span className={styles.buttonText}>Детальніше</span>
            </Link>
            <button
              onClick={onBuy}
              disabled={!painting.isAvailable}
              aria-label={painting.isAvailable ? 'Купити' : 'Продано'}
              className={styles.buyButton}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={styles.buttonIcon}
              >
                <path
                  d="M3 4h2l.4 2M7 13h10l3-8H6.4M7 13 5.4 6M7 13l-1.6 3.2A1 1 0 0 0 6.3 18H17"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="21" r="1.4" fill="currentColor" />
                <circle cx="17" cy="21" r="1.4" fill="currentColor" />
              </svg>
              <span className={styles.buttonText}>
                {painting.isAvailable ? 'В кошик' : 'Продано'}
              </span>
            </button>
          </div>
        )}

        {isAdmin && !compact && (
          <div className={styles.adminActions}>
            <button
              onClick={onEdit}
              aria-label="Редагувати"
              className={styles.editButton}
            >
              <svg viewBox="0 0 24 24" fill="none" className={styles.buttonIcon}>
                <path
                  d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className={styles.buttonText}>Редагувати</span>
            </button>
            <button
              onClick={onDelete}
              aria-label="Видалити"
              className={styles.deleteButton}
            >
              <svg viewBox="0 0 24 24" fill="none" className={styles.buttonIcon}>
                <path
                  d="M4 7h16M9 7V4h6v3m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className={styles.buttonText}>Видалити</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
