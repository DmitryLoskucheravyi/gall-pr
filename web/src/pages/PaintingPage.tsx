import { useEffect, useRef, useState } from 'react';
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
import { safeJsonLd } from '../utils/safeUrl';
import { cdnImage } from '../utils/imageUrl';
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
  const [isDescOpen, setIsDescOpen] = useState(true);
  const [isCharOpen, setIsCharOpen] = useState(true);

  // The slider is a real horizontal scroller rather than one image swapped in
  // place, so a phone can swipe through the shots with the momentum and
  // rubber-banding it does everywhere else. That makes the scroll position the
  // one source of truth: the arrows and thumbnails scroll it, and activeImage
  // follows from where it ends up rather than being set alongside it.
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollFrame = useRef(0);

  useEscapeKey(() => setLightboxOpen(false), lightboxOpen);

  useEffect(() => {
    setActiveImage(0);
    // Instantly, not smoothly: this is a different painting, not a move
    // within the current one.
    trackRef.current?.scrollTo({ left: 0, behavior: 'instant' as ScrollBehavior });
  }, [id]);

  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), []);

  // Arrows and thumbnails move the scroller; they don't set the index. The
  // scroll handler below does that, so the two can never disagree — which is
  // exactly what would happen if a swipe changed the position without anyone
  // telling the thumbnails about it.
  const goToImage = (index: number) => {
    const track = trackRef.current;
    if (!track) return;

    track.scrollTo({ left: track.clientWidth * index, behavior: 'smooth' });
  };

  const handleTrackScroll = () => {
    // Scroll fires far more often than the screen repaints, and every one of
    // these would otherwise be a React render.
    if (scrollFrame.current) return;

    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = 0;

      const track = trackRef.current;
      if (!track || track.clientWidth === 0) return;

      const index = Math.round(track.scrollLeft / track.clientWidth);
      // Setting the same value is a no-op in React, so the smooth scrolls
      // above don't cause a render per frame.
      setActiveImage(index);
    });
  };

  usePageMeta(
    painting?.title,
    painting
      ? `${painting.title}${authorName ? ` — ${authorName}` : ''}. Оригінальна картина, ${Number(painting.price).toLocaleString('uk-UA')} ₴.`
      : undefined,
  );

  if (loading) {
    return (
      <div>
        <div className={styles.grid}>
          <div className={styles.imageWrap}>
            <button
              onClick={() => navigate(-1)}
              className={styles.backButton}
              aria-label="Назад"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 12H5M11 6l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

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
        // Escaped rather than plain JSON.stringify: the painting's title and
        // description end up inside a <script> block, where a literal
        // "</script>" would close it early and turn the rest into markup.
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
      />

      <div className={styles.grid}>
        <div>
          <div className={styles.imageWrap}>
            <button
              onClick={() => navigate(-1)}
              className={styles.backButton}
              aria-label="Назад"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 12H5M11 6l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div
              ref={trackRef}
              onScroll={handleTrackScroll}
              className={styles.track}
            >
              {images.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className={styles.slide}
                  aria-label={`Відкрити зображення ${index + 1} на весь екран`}
                >
                  <img
                    src={cdnImage(url, 1400)}
                    alt={index === 0 ? painting.title : ''}
                    aria-hidden={index === 0 ? undefined : 'true'}
                    // Every shot is in the DOM now that this scrolls, so only
                    // the one on screen is worth fetching up front.
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className={styles.mainImage}
                  />
                </button>
              ))}
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    goToImage((activeImage - 1 + images.length) % images.length)
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
                  onClick={() => goToImage((activeImage + 1) % images.length)}
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
                  onClick={() => goToImage(index)}
                  className={`${styles.thumbButton} ${
                    index === activeImage ? styles.active : ''
                  }`}
                  aria-label={`Зображення ${index + 1}`}
                >
                  <img
                    src={cdnImage(url, 160)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={styles.thumbImage}
                  />
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
          <Painting3DViewer
            imageUrl={painting.animation3dImage}
            title={painting.title}
          />
        </section>
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
