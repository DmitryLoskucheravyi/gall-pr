'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePaintings } from '../hooks/queries/usePaintings';
import GalleryCard from '../components/GalleryCard';
import GalleryCardSkeleton from '../components/GalleryCardSkeleton';
import GrowingBranches from '../components/ui/GrowingBranches';
import styles from './GalleryPage.module.scss';

export default function GalleryPage() {
  const { t } = useTranslation('gallery');

  // Two views of the collection: all of it, or only the works the artist
  // will paint again. The list is fetched whole (up to 60) and narrowed here;
  // the server has no filter for repeatability, and at this size it needs none.
  const [repeatOnly, setRepeatOnly] = useState(false);

  const { data: paintingsResponse, isLoading: loading } = usePaintings({
    page: 1,
    limit: 60,
  });

  const paintings = paintingsResponse?.data ?? [];

  const visiblePaintings = repeatOnly
    ? paintings.filter((painting) => painting.isRepeatable)
    : paintings;

  return (
    <div>
      <GrowingBranches />
      <div className={styles.header}>
        <h1 className={styles.title}>{t('pageTitle')}</h1>
      </div>

      <div className={styles.chips}>
        <button
          type="button"
          onClick={() => setRepeatOnly(false)}
          className={repeatOnly ? styles.chip : styles.chipActive}
          aria-pressed={!repeatOnly}
        >
          {t('allTechniques')}
        </button>
        <button
          type="button"
          onClick={() => setRepeatOnly(true)}
          className={repeatOnly ? styles.chipActive : styles.chip}
          aria-pressed={repeatOnly}
        >
          {t('repeatable')}
        </button>
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 12 }).map((_, index) => (
            <GalleryCardSkeleton key={index} />
          ))}
        </div>
      ) : visiblePaintings.length === 0 ? (
        <p className={styles.muted}>
          {t('emptyAll')}
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
