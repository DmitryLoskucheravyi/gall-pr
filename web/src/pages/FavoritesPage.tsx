import { useEffect, useState } from 'react';

import { likesService } from '../api/likes.api';
import type { Painting } from '../types/painting.types';
import PaintingCard from '../components/PaintingCard';
import { useAddToCart } from '../hooks/useAddToCart';
import styles from './FavoritesPage.module.scss';

export default function FavoritesPage() {
  const addToCart = useAddToCart();
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    likesService
      .getMyLikedPaintings()
      .then(setPaintings)
      .catch(() => setPaintings([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className={styles.title}>Улюблені</h1>

      {loading ? (
        <p className={styles.muted}>Завантаження…</p>
      ) : paintings.length === 0 ? (
        <p className={styles.muted}>
          Ви ще не вподобали жодної картини
        </p>
      ) : (
        <div className={styles.grid}>
          {paintings.map((painting) => (
            <PaintingCard
              key={painting.id}
              painting={painting}
              onBuy={() => addToCart(painting)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
