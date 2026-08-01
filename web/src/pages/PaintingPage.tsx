import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import PaintingCard from '../components/PaintingCard';
import Painting3DViewer from '../components/Painting3DViewer';
import LikeButton from '../components/ui/LikeButton';
import Skeleton from '../components/ui/Skeleton';
import { usePainting } from '../hooks/queries/usePainting';
import { useRelatedPaintings } from '../hooks/queries/useRelatedPaintings';
import { useAddToCart } from '../hooks/mutations/useAddToCart';
import { useAuthorName } from '../hooks/queries/useSettings';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { usePageMeta } from '../hooks/usePageMeta';
import styles from './PaintingPage.module.scss';

export default function PaintingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToCart = useAddToCart();
  const authorName = useAuthorName();

  const { data: painting, isLoading: loading } = usePainting(
    id ? Number(id) : undefined,
  );
  const { related } = useRelatedPaintings(painting);

  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [show3DModal, setShow3DModal] = useState(false);
  const [isDescOpen, setIsDescOpen] = useState(true);
  const [isCharOpen, setIsCharOpen] = useState(true);

  useEscapeKey(() => setLightboxOpen(false), lightboxOpen);
  useEscapeKey(() => setShow3DModal(false), show3DModal);

  useEffect(() => {
    setActiveImage(0);
  }, [id]);

  usePageMeta(
    painting?.title,
    painting
      ? `${painting.title}${authorName ? ` — ${authorName}` : ''}. Оригінальна картина, ${Number(painting.price).toLocaleString('uk-UA')} ₴.`
      : undefined,
  );

  if (loading) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← Назад
        </button>

        <div className={styles.grid}>
          <div>
            <Skeleton className={styles.skeletonImage} />
          </div>

          <div>
            <Skeleton className={styles.skeletonTitle} />
            <Skeleton className={styles.skeletonAuthor} />
            <Skeleton className={styles.skeletonPrice} />
            <Skeleton className={styles.skeletonButton} />
            <Skeleton className={styles.skeletonDescription} />
          </div>
        </div>
      </div>
    );
  }

  if (!painting) return <p className={styles.muted}>Картину не знайдено</p>;

  const images = painting.images.length > 0 ? painting.images : [painting.cardImage];
  const price = Number(painting.price);

  // Product structured data — lets search engines show the painting as a rich
  // result (name, image, price, availability).
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: painting.title,
    image: images,
    ...(painting.description ? { description: painting.description } : {}),
    ...(authorName ? { brand: { '@type': 'Brand', name: authorName } } : {}),
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'UAH',
      availability: painting.isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <button onClick={() => navigate(-1)} className={styles.backButton}>
        ← Назад
      </button>

      <div className={styles.grid}>
        <div>
          <div className={styles.imageWrap}>
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
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImage(
                      (prev) => (prev - 1 + images.length) % images.length,
                    )
                  }
                  className={`${styles.navArrow} ${styles.navArrowLeft}`}
                  aria-label="Попереднє зображення"
                >
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="m15 6-6 6 6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveImage((prev) => (prev + 1) % images.length)
                  }
                  className={`${styles.navArrow} ${styles.navArrowRight}`}
                  aria-label="Наступне зображення"
                >
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="m9 6 6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>

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
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{painting.title}</h1>
            <LikeButton
              paintingId={painting.id}
              likesCount={painting.likesCount}
            />
          </div>

          {!!authorName && <p className={styles.author}>{authorName}</p>}

          <p className={styles.price}>{price.toLocaleString()} ₴</p>

          <button
            onClick={() => addToCart.mutate(painting)}
            disabled={!painting.isAvailable}
            className={styles.buyButton}
          >
            {painting.isAvailable ? 'Купити' : 'Продано'}
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

      {painting.animation3dImage && (
        <section className={styles.animation3d}>
          <h2 className={styles.animation3dTitle}>3D перегляд</h2>
          <div className={styles.animation3dPreview}>
            <img
              src={painting.animation3dImage}
              alt=""
              className={styles.animation3dImage}
            />
            <button
              type="button"
              onClick={() => setShow3DModal(true)}
              className={styles.animation3dLabel}
            >
              3D
            </button>
          </div>
        </section>
      )}

      {show3DModal && painting.animation3dImage && (
        <div
          onClick={() => setShow3DModal(false)}
          className={styles.modal3dOverlay}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className={styles.modal3dContent}
          >
            <button
              type="button"
              onClick={() => setShow3DModal(false)}
              className={styles.modal3dClose}
              aria-label="Закрити"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="m6 6 12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <Painting3DViewer imageUrl={painting.animation3dImage} />
          </div>
        </div>
      )}

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
