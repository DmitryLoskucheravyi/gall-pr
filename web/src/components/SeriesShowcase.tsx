import { useTranslation } from 'react-i18next';

import PaintingCard from './PaintingCard';
import PaintingCardSkeleton from './PaintingCardSkeleton';
import { useSeriesShowcase } from '../hooks/queries/useSeries';
import { useLocale } from '../hooks/useLocale';
import { pickLocale } from '../utils/localizedField';
import type { Painting } from '../types/painting.types';
import styles from './SeriesShowcase.module.scss';

type Props = {
  isAdmin: boolean;
  onBuy: (painting: Painting) => void;
  onEdit: (painting: Painting) => void;
  onDelete: (painting: Painting) => void;
};

// The catalogue's "Серії" view: a stack of series, each a name over the row of
// works in it. Not a grid of covers — the point is to see the paintings
// themselves grouped by the body of work they came from.
//
// Each row scrolls horizontally rather than wrapping, so a long series stays
// one series instead of becoming a wall that buries the next name.
export default function SeriesShowcase({
  isAdmin,
  onBuy,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation('catalog');
  const locale = useLocale();
  const { data: series = [], isLoading } = useSeriesShowcase(true);

  if (isLoading) {
    return (
      <div className={styles.stack}>
        {Array.from({ length: 2 }).map((_, index) => (
          <section key={index} className={styles.series}>
            <div className={styles.headingSkeleton} />
            <div className={styles.row}>
              {Array.from({ length: 4 }).map((__, cardIndex) => (
                <div key={cardIndex} className={styles.cell}>
                  <PaintingCardSkeleton />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // Series with nothing in them are the artist's drafts, not something a
  // visitor should scroll past an empty heading for.
  const filled = series.filter((entry) => entry.paintings.length > 0);

  if (filled.length === 0) {
    return <p className={styles.empty}>{t('series.empty')}</p>;
  }

  return (
    <div className={styles.stack}>
      {filled.map((entry) => {
        const name = pickLocale(entry, 'name', locale);
        const description = pickLocale(entry, 'description', locale);
        const hidden = entry.paintingsCount - entry.paintings.length;

        return (
          <section key={entry.id} className={styles.series}>
            <div className={styles.header}>
              <h2 className={styles.name}>{name}</h2>
              <span className={styles.count}>
                {t('series.count', { count: entry.paintingsCount })}
              </span>
            </div>

            {description && <p className={styles.description}>{description}</p>}

            <div className={styles.row}>
              {entry.paintings.map((painting) => (
                <div key={painting.id} className={styles.cell}>
                  <PaintingCard
                    painting={painting}
                    isAdmin={isAdmin}
                    onBuy={() => onBuy(painting)}
                    onEdit={() => onEdit(painting)}
                    onDelete={() => onDelete(painting)}
                  />
                </div>
              ))}

              {/* The row is capped server-side; say so rather than silently
                  showing part of a series as if it were all of it. */}
              {hidden > 0 && (
                <div className={styles.more}>
                  {t('series.more', { count: hidden })}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
