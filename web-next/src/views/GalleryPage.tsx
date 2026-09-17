'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTechniques } from '../hooks/queries/useTechniques';
import { usePaintings } from '../hooks/queries/usePaintings';
import { useLikedIds } from '../hooks/queries/useLikedIds';
import { useLocale } from '../hooks/useLocale';
import { pickLocale } from '../utils/localizedField';
import GalleryCard from '../components/GalleryCard';
import GalleryCardSkeleton from '../components/GalleryCardSkeleton';
import { useAppSelector } from '../store/hooks';
import styles from './GalleryPage.module.scss';

export default function GalleryPage() {
  const { t } = useTranslation('gallery');
  const locale = useLocale();

  const user = useAppSelector((state) => state.auth.user);
  const { data: likedIds = [] } = useLikedIds();

  const [selectedTechniqueId, setSelectedTechniqueId] = useState<
    number | null
  >(null);
  const [showLikedOnly, setShowLikedOnly] = useState(false);

  const { data: techniques = [] } = useTechniques();
  const { data: paintingsResponse, isLoading: loading } = usePaintings({
    page: 1,
    limit: 60,
    techniqueId: selectedTechniqueId ?? undefined,
  });

  const paintings = paintingsResponse?.data ?? [];

  const visiblePaintings = showLikedOnly
    ? paintings.filter((painting) => likedIds.includes(painting.id))
    : paintings;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('pageTitle')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>
      </div>

      <div className={styles.chips}>
        <button
          onClick={() => setSelectedTechniqueId(null)}
          className={
            selectedTechniqueId === null ? styles.chipActive : styles.chip
          }
        >
          {t('allTechniques')}
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
            {pickLocale(technique, 'name', locale)}
          </button>
        ))}

        {user && (
          <button
            onClick={() => setShowLikedOnly((prev) => !prev)}
            className={showLikedOnly ? styles.chipActive : styles.chip}
          >
            {t('likedOnly')}
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
          {showLikedOnly ? t('emptyLiked') : t('emptyAll')}
        </p>
      ) : (
        <div className={styles.grid}>
          {visiblePaintings.map((painting) => (
            <GalleryCard key={painting.id} painting={painting} natural />
          ))}
        </div>
      )}
    </div>
  );
}
