import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { paintingsService } from '../api/paintings.api';
import type { Painting } from '../types/painting.types';
import PaintingCard from '../components/PaintingCard';
import { useAddToCart } from '../hooks/useAddToCart';
import { useAppSelector } from '../store/hooks';
import styles from './PaintingPage.module.scss';

export default function PaintingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToCart = useAddToCart();
  const authorName = useAppSelector((state) => state.settings.authorName);

  const [painting, setPainting] = useState<Painting | null>(null);
  const [related, setRelated] = useState<Painting[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isDescOpen, setIsDescOpen] = useState(true);
  const [isCharOpen, setIsCharOpen] = useState(true);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setActiveImage(0);

    paintingsService
      .getPainting(Number(id))
      .then(setPainting)
      .catch(() => setPainting(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!painting) return;

    let cancelled = false;

    const loadRelated = async () => {
      let items: Painting[] = [];

      if (painting.techniqueId) {
        const sameCategory = await paintingsService.getPaintings(
          1,
          8,
          painting.techniqueId,
        );
        items = sameCategory.data.filter((item) => item.id !== painting.id);
      }

      if (items.length === 0) {
        const fallback = await paintingsService.getPaintings(1, 8);
        items = fallback.data.filter((item) => item.id !== painting.id);
      }

      if (!cancelled) setRelated(items);
    };

    loadRelated();

    return () => {
      cancelled = true;
    };
  }, [painting]);

  if (loading) return <p className={styles.muted}>Завантаження…</p>;
  if (!painting) return <p className={styles.muted}>Картину не знайдено</p>;

  const images = painting.images.length > 0 ? painting.images : [painting.cardImage];
  const price = Number(painting.price);

  return (
    <div>
      <button onClick={() => navigate(-1)} className={styles.backButton}>
        ← Назад
      </button>

      <div className={styles.grid}>
        <div>
          <button
            onClick={() => setLightboxOpen(true)}
            className={styles.mainImageButton}
          >
            <img
              src={images[activeImage]}
              alt={painting.title}
              className={styles.mainImage}
            />
          </button>

          {images.length > 1 && (
            <div className={styles.thumbs}>
              {images.map((url, index) => (
                <button
                  key={url}
                  onClick={() => setActiveImage(index)}
                  className={`${styles.thumbButton} ${
                    index === activeImage ? styles.active : ''
                  }`}
                >
                  <img src={url} alt="" className={styles.thumbImage} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className={styles.title}>{painting.title}</h1>

          {!!authorName && <p className={styles.author}>{authorName}</p>}

          <p className={styles.price}>{price.toLocaleString()} ₴</p>

          <button onClick={() => addToCart(painting)} className={styles.buyButton}>
            Купити
          </button>

          <SectionHeader
            title="Опис"
            open={isDescOpen}
            onClick={() => setIsDescOpen((prev) => !prev)}
            spacing="lg"
          />
          {isDescOpen && (
            <p className={styles.description}>{painting.description}</p>
          )}

          <SectionHeader
            title="Характеристики"
            open={isCharOpen}
            onClick={() => setIsCharOpen((prev) => !prev)}
            spacing="sm"
          />
          {isCharOpen && (
            <dl className={styles.specList}>
              {!!authorName && <Row label="Автор" value={authorName} />}
              {painting.year && (
                <Row label="Рік" value={String(painting.year)} />
              )}
              {painting.technique && (
                <Row label="Техніка" value={painting.technique.name} />
              )}
              {painting.material && (
                <Row label="Матеріал" value={painting.material.name} />
              )}
              {painting.width && painting.height && (
                <Row
                  label="Розмір"
                  value={`${painting.width} × ${painting.height} см`}
                />
              )}
            </dl>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedTitle}>Вам також може сподобатись</h2>
          <div className={styles.relatedGrid}>
            {related.map((item) => (
              <PaintingCard key={item.id} painting={item} compact />
            ))}
          </div>
        </section>
      )}

      {lightboxOpen && (
        <div onClick={() => setLightboxOpen(false)} className={styles.lightbox}>
          <img
            src={images[activeImage]}
            alt={painting.title}
            className={styles.lightboxImage}
          />
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  open,
  onClick,
  spacing,
}: {
  title: string;
  open: boolean;
  onClick: () => void;
  spacing: 'lg' | 'sm';
}) {
  return (
    <button
      onClick={onClick}
      className={`${styles.sectionHeader} ${
        spacing === 'lg'
          ? styles.sectionHeaderSpacedTop
          : styles.sectionHeaderSpacedTopSm
      }`}
    >
      <span className={styles.sectionTitle}>{title}</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${styles.chevron} ${open ? styles.open : ''}`}
      >
        <path
          d="m6 9 6 6 6-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.specRow}>
      <dt className={styles.specLabel}>{label}</dt>
      <dd className={styles.specValue}>{value}</dd>
    </div>
  );
}
