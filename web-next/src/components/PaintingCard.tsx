import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from './ui/LocalizedLink';
import type { Painting } from '../types/painting.types';
import { useAuthorName } from '../hooks/queries/useSettings';
import { useLocale } from '../hooks/useLocale';
import { useExchangeRate } from '../hooks/queries/useExchangeRate';
import { pickLocale } from '../utils/localizedField';
import { formatPrice } from '../utils/formatPrice';
import LikeButton from './ui/LikeButton';
import styles from './PaintingCard.module.scss';
import { cdnImage } from '../utils/imageUrl';
import { editionLabel } from '../utils/edition';

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
  const { t } = useTranslation('common');
  const locale = useLocale();
  const authorName = useAuthorName();
  const { data: usdRate } = useExchangeRate();
  const price = Number(painting.price);
  const title = pickLocale(painting, 'title', locale);

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        <Link to={`/painting/${painting.id}`} className={styles.imageLink}>
          <img
            src={cdnImage(painting.cardImage, 600)}
            alt={title}
            loading="lazy"
            decoding="async"
            className={styles.image}
          />
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
          {title}
        </Link>

        {!!authorName && <span className={styles.author}>{authorName}</span>}

        {!compact && painting.width && painting.height && (
          <span className={styles.size}>
            {painting.width} × {painting.height} {t('sizeUnit')}
          </span>
        )}

        <span className={styles.price}>{formatPrice(price, locale, usdRate)}</span>

        {!compact && (
          <div className={styles.actions}>
            <Link
              to={`/painting/${painting.id}`}
              aria-label={t('details')}
              className={styles.detailsButton}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.buttonIcon}>
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
              <span className={styles.buttonText}>{t('details')}</span>
            </Link>
            <button
              onClick={onBuy}
              disabled={!painting.isAvailable}
              aria-label={painting.isAvailable ? t('buy') : t('sold')}
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
                {painting.isAvailable ? t('addToCart') : t('sold')}
              </span>
            </button>
          </div>
        )}

        {isAdmin && !compact && (
          <div className={styles.adminActions}>
            <button
              onClick={onEdit}
              aria-label={t('edit')}
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
              <span className={styles.buttonText}>{t('edit')}</span>
            </button>
            <button
              onClick={onDelete}
              aria-label={t('delete')}
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
              <span className={styles.buttonText}>{t('delete')}</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
