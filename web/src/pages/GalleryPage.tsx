import { useEffect, useState } from 'react';

import { paintingsService } from '../api/paintings.api';
import { techniquesService } from '../api/techniques.api';
import type { Painting } from '../types/painting.types';
import type { Technique } from '../types/dictionaries.types';
import GalleryCard from '../components/GalleryCard';
import GalleryCardSkeleton from '../components/GalleryCardSkeleton';
import { useAppSelector } from '../store/hooks';
import styles from './GalleryPage.module.scss';

export default function GalleryPage() {
  const user = useAppSelector((state) => state.auth.user);
  const likedIds = useAppSelector((state) => state.likes.likedIds);

  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<
    number | null
  >(null);
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const visiblePaintings = showLikedOnly
    ? paintings.filter((painting) => likedIds.includes(painting.id))
    : paintings;

  useEffect(() => {
    techniquesService.getTechniques().then(setTechniques);
  }, []);

  useEffect(() => {
    setLoading(true);

    paintingsService
      .getPaintings(1, 60, selectedTechniqueId ?? undefined)
      .then((response) => setPaintings(response.data))
      .catch(() => setPaintings([]))
      .finally(() => setLoading(false));
  }, [selectedTechniqueId]);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Галерея</h1>
        <p className={styles.subtitle}>
          Уся колекція робіт — доступні для придбання та вже продані
        </p>
      </div>

      <div className={styles.chips}>
        <button
          onClick={() => setSelectedTechniqueId(null)}
          className={
            selectedTechniqueId === null ? styles.chipActive : styles.chip
          }
        >
          Усі
        </button>

        {techniques.map((technique) => (
          <button
            key={technique.id}
            onClick={() => setSelectedTechniqueId(technique.id)}
            className={
              selectedTechniqueId === technique.id
                ? styles.chipActive
                : styles.chip
            }
          >
            {technique.name}
          </button>
        ))}

        {user && (
          <button
            onClick={() => setShowLikedOnly((prev) => !prev)}
            className={showLikedOnly ? styles.chipActive : styles.chip}
          >
            ♥ Уподобані
          </button>
        )}
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 12 }).map((_, index) => (
            <GalleryCardSkeleton key={index} />
          ))}
        </div>
      ) : visiblePaintings.length === 0 ? (
        <p className={styles.muted}>
          {showLikedOnly
            ? 'Ви ще нічого не вподобали'
            : 'Картин поки немає'}
        </p>
      ) : (
        <div className={styles.grid}>
          {visiblePaintings.map((painting) => (
            <GalleryCard key={painting.id} painting={painting} />
          ))}
        </div>
      )}
    </div>
  );
}
