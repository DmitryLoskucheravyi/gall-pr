import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { likesService } from '../api/likes.api';
import type { Painting } from '../types/painting.types';
import GalleryCard from '../components/GalleryCard';
import GalleryCardSkeleton from '../components/GalleryCardSkeleton';
import { useAppSelector } from '../store/hooks';
import styles from './ProfilePage.module.scss';

const FAVORITES_PREVIEW_LIMIT = 6;

export default function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user);
  const [likedPaintings, setLikedPaintings] = useState<Painting[]>([]);
  const [likedLoading, setLikedLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    likesService
      .getMyLikedPaintings()
      .then(setLikedPaintings)
      .catch(() => setLikedPaintings([]))
      .finally(() => setLikedLoading(false));
  }, [user]);

  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className={styles.wrap}>
      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.header}>
            <div className={styles.avatar}>{initials || '?'}</div>

            <div className={styles.headerInfo}>
              <div className={styles.nameRow}>
                <h1 className={styles.name}>
                  {user.firstName} {user.lastName}
                </h1>
                {user.role === 'ADMIN' && (
                  <span className={styles.adminBadge}>Адміністратор</span>
                )}
              </div>
              <p className={styles.email}>{user.email}</p>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.infoLabel}>Email</p>
              <p className={styles.infoValue}>{user.email}</p>
            </div>

            <div className={styles.statCard}>
              <p className={styles.infoLabel}>Телефон</p>
              <p className={styles.infoValue}>{user.phone || '—'}</p>
            </div>

            <Link to="/orders" className={styles.statCardLink}>
              <p className={styles.infoLabel}>Замовлення</p>
              <p className={styles.infoValue}>Переглянути →</p>
            </Link>
          </div>
        </div>

        <section className={styles.favoritesSection}>
          <div className={styles.favoritesHeader}>
            <h2 className={styles.favoritesTitle}>Уподобані</h2>
            {likedPaintings.length > 0 && (
              <Link to="/favorites" className={styles.favoritesLink}>
                Усі →
              </Link>
            )}
          </div>

          {likedLoading ? (
            <div className={styles.favoritesGrid}>
              {Array.from({ length: 6 }).map((_, index) => (
                <GalleryCardSkeleton key={index} />
              ))}
            </div>
          ) : likedPaintings.length === 0 ? (
            <p className={styles.favoritesEmpty}>
              Ви ще не вподобали жодної картини
            </p>
          ) : (
            <div className={styles.favoritesGrid}>
              {likedPaintings.slice(0, FAVORITES_PREVIEW_LIMIT).map((painting) => (
                <GalleryCard key={painting.id} painting={painting} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
