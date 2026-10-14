import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from './ui/LocalizedLink';
import LikeButton from './ui/LikeButton';
import { useLocale } from '../hooks/useLocale';
import { useExchangeRate } from '../hooks/queries/useExchangeRate';
import { pickLocale } from '../utils/localizedField';
import { formatPrice } from '../utils/formatPrice';
import { cdnImage } from '../utils/imageUrl';
import { inStock } from '../utils/stock';
import type { Painting } from '../types/painting.types';
import styles from './SeriesWorkCard.module.scss';

// A work in a series row: the picture alone, every one at the same height and
// as wide as its own proportions make it, so a series reads as a hang on a
// wall rather than a grid of product tiles. Everything else — title, price,
// buying, the admin's tools — lives on a drawer that rises from the bottom
// edge on hover (or focus), and stays up on a touch screen, which has no
// hover to reveal it.

type Props = {
  painting: Painting;
  onBuy?: () => void;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function SeriesWorkCard({ painting, onBuy, isAdmin, onEdit, onDelete }: Props) {
  const { t } = useTranslation('common');
  const locale = useLocale();
  const { data: usdRate } = useExchangeRate();
  const available = inStock(painting);
  const title = pickLocale(painting, 'title', locale);

  // The frame takes the canvas's own proportions before the photo arrives, so
  // the row does not shuffle as the images land. Width over height, in cm.
  // Clamped: a tall, narrow canvas (13 × 32 cm) would otherwise be a sliver in
  // the row, and a long landscape a band; the photo is cropped to the frame.
  const raw = painting.width && painting.height ? painting.width / painting.height : 4 / 5;
  const ratio = Math.min(1.5, Math.max(0.72, raw));

  return (
    <article className={styles.card} style={{ '--ratio': ratio } as CSSProperties}>
      <Link to={`/painting/${painting.id}`} className={styles.imageLink} aria-label={title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cdnImage(painting.cardImage, 700)}
          alt={title}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={styles.image}
        />
      </Link>

      {!available ? <span className={styles.sold}>{t('sold')}</span> : null}

      <div className={styles.drawer}>
        <div className={styles.info}>
          <span className={styles.title}>{title}</span>
          <span className={styles.price}>{formatPrice(Number(painting.price), locale, usdRate)}</span>
        </div>

        <div className={styles.actions}>
          <span className={styles.like}>
            <LikeButton paintingId={painting.id} likesCount={painting.likesCount} showCount={false} />
          </span>

          <Link to={`/painting/${painting.id}`} className={styles.icon} aria-label={t('details')} title={t('details')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.8 12.2c2.4-4 5.5-6 9.2-6s6.8 2 9.2 6c-2.4 3.9-5.5 5.9-9.2 5.9s-6.8-2-9.2-5.9z" />
              <circle cx="12" cy="12.1" r="2.9" />
            </svg>
          </Link>

          <button
            type="button"
            className={styles.icon}
            onClick={onBuy}
            disabled={!available}
            aria-label={available ? t('addToCart') : t('sold')}
            title={available ? t('addToCart') : t('sold')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3.2 4.3h2l2.3 10.4c.1.6.6 1 1.2 1h8.6c.6 0 1-.4 1.2-.9l1.9-6.4H6.4" />
              <circle cx="9.4" cy="19.6" r="1.3" />
              <circle cx="16.8" cy="19.6" r="1.3" />
            </svg>
          </button>

          {isAdmin ? (
            <>
              <button type="button" className={styles.icon} onClick={onEdit} aria-label={t('edit')} title={t('edit')}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15.8 4.6c.8-.8 2.1-.8 2.9 0l.7.7c.8.8.8 2.1 0 2.9L8.6 19l-4.3 1 1-4.3z" />
                </svg>
              </button>
              <button
                type="button"
                className={`${styles.icon} ${styles.danger}`}
                onClick={onDelete}
                aria-label={t('delete')}
                title={t('delete')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4.5 7.2h15M9.4 7V4.6h5.2V7M6.6 7.3l.9 12.1c.1.6.5 1 1.1 1h6.8c.6 0 1-.4 1.1-1l.9-12.1" />
                </svg>
              </button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
