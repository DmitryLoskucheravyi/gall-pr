import { useTranslation } from 'react-i18next';

import { useLikedPaintings } from '../hooks/queries/useLikedPaintings';
import PaintingCard from '../components/PaintingCard';
import PaintingCardSkeleton from '../components/PaintingCardSkeleton';
import { useAddToCart } from '../hooks/mutations/useAddToCart';
import styles from './FavoritesPage.module.scss';

export default function FavoritesPage() {
  const { t } = useTranslation('favorites');
  const addToCart = useAddToCart();
  const { data: paintings = [], isLoading: loading } = useLikedPaintings();

  return (
    <div>
      <h1 className={styles.title}>{t('title')}</h1>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <PaintingCardSkeleton key={index} />
          ))}
        </div>
      ) : paintings.length === 0 ? (
        <p className={styles.muted}>{t('empty')}</p>
      ) : (
        <div className={styles.grid}>
          {paintings.map((painting) => (
            <PaintingCard
              key={painting.id}
              painting={painting}
              onBuy={() => addToCart.mutate(painting)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
