'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useLocale } from '../hooks/useLocale';
import { pickLocale } from '../utils/localizedField';
import { useExchangeRate } from '../hooks/queries/useExchangeRate';
import { formatPrice } from '../utils/formatPrice';
import PaintingCard from '../components/PaintingCard';
import Painting3DViewer from '../components/Painting3DViewer';
import InteriorCarousel from '../components/InteriorCarousel';
import CommissionModal from '../components/CommissionModal';
import PaintingSeriesControl from '../components/admin/PaintingSeriesControl';
import LikeButton from '../components/ui/LikeButton';
import Skeleton from '../components/ui/Skeleton';
import { usePainting } from '../hooks/queries/usePainting';
import { useRelatedPaintings } from '../hooks/queries/useRelatedPaintings';
import { useAddToCart } from '../hooks/mutations/useAddToCart';
import { useAuthorName } from '../hooks/queries/useSettings';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useAppSelector } from '../store/hooks';
import { safeJsonLd } from '../utils/safeUrl';
import { cdnImage } from '../utils/imageUrl';
import styles from './PaintingPage.module.scss';

export default function PaintingPage() {
  const { t } = useTranslation('painting');
  const locale = useLocale();
  // Only the admin sees the series control below — everything else on this
  // page is the same for everyone.
  const user = useAppSelector((state) => state.auth.user);
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const addToCart = useAddToCart();
  const authorName = useAuthorName();
  const { data: usdRate } = useExchangeRate();

  const { data: painting, isLoading: loading } = usePainting(
    id ? Number(id) : undefined,
  );
  const { related } = useRelatedPaintings(painting);

  // Derived above every hook, and tolerant of `painting` still being
  // undefined, because the hooks below read these in their dependency arrays —
  // which are evaluated during render. Declared after the early return for the
  // loading state, as they used to be, they sit in the temporal dead zone at
  // that point and the whole page throws.
  const images = !painting
    ? []
    : painting.images.length > 0
      ? painting.images
      : [painting.cardImage];

  // Set by the admin per painting; most works simply won't have any, and the
  // section is left out entirely then.
  const interiorImages = painting?.interiorImages ?? [];

  // How long the slider arrows linger after the last sign of interest.
  const ARROW_IDLE_MS = 2200;

  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isDescOpen, setIsDescOpen] = useState(true);
  const [isCharOpen, setIsCharOpen] = useState(true);
  const [commissionOpen, setCommissionOpen] = useState(false);

  // The slider is a real horizontal scroller rather than one image swapped in
  // place, so a phone can swipe through the shots with the momentum and
  // rubber-banding it does everywhere else. That makes the scroll position the
  // one source of truth: the arrows and thumbnails scroll it, and activeImage
  // follows from where it ends up rather than being set alongside it.
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollFrame = useRef(0);

  const [arrowsVisible, setArrowsVisible] = useState(false);
  const arrowTimer = useRef(0);

  const lightboxTrackRef = useRef<HTMLDivElement>(null);
  const lightboxFrame = useRef(0);
  // Captured at the moment the lightbox opens, so the positioning effect can
  // read it without depending on activeImage and re-running on every swipe.
  const activeImageOnOpen = useRef(0);

  useEscapeKey(() => setLightboxOpen(false), lightboxOpen);

  useEffect(() => {
    setActiveImage(0);
    // Instantly, not smoothly: this is a different painting, not a move
    // within the current one.
    trackRef.current?.scrollTo({ left: 0, behavior: 'instant' as ScrollBehavior });
  }, [id]);

  useEffect(
    () => () => {
      cancelAnimationFrame(scrollFrame.current);
      cancelAnimationFrame(lightboxFrame.current);
      window.clearTimeout(arrowTimer.current);
    },
    [],
  );

  // Arrows and thumbnails move the scroller; they don't set the index. The
  // scroll handler below does that, so the two can never disagree — which is
  // exactly what would happen if a swipe changed the position without anyone
  // telling the thumbnails about it.
  const goToImage = (index: number) => {
    const track = trackRef.current;
    if (!track) return;

    track.scrollTo({ left: track.clientWidth * index, behavior: 'smooth' });
  };

  // The lightbox is the same idea as the slider below it: a snapping scroller,
  // so it swipes on a phone without a line of gesture code. It shares
  // activeImage with the page, so opening it lands on the shot you were
  // looking at and closing it leaves the page on whatever you swiped to.
  useEffect(() => {
    if (!lightboxOpen) return;

    const track = lightboxTrackRef.current;
    if (!track) return;

    track.scrollTo({
      left: track.clientWidth * activeImageOnOpen.current,
      behavior: 'instant' as ScrollBehavior,
    });
    // activeImage is deliberately not a dependency: this positions the track
    // when the lightbox opens, and must not fight the user's swipes after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen]);

  // Arrow keys move through the shots while the lightbox is up; Escape is
  // already handled by useEscapeKey above.
  useEffect(() => {
    if (!lightboxOpen || images.length < 2) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goToLightboxImage((activeImage - 1 + images.length) % images.length);
      } else if (event.key === 'ArrowRight') {
        goToLightboxImage((activeImage + 1) % images.length);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // Rebound whenever the current shot changes, so the handler always knows
    // which one it's stepping from. goToLightboxImage only touches a ref, so
    // it doesn't need to be here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, activeImage, images.length]);

  const openLightbox = () => {
    activeImageOnOpen.current = activeImage;
    setLightboxOpen(true);
  };

  // Closing carries the position back to the page's own slider, so the two
  // never disagree about which shot you were on.
  const closeLightbox = () => {
    setLightboxOpen(false);
    goToImage(activeImage);
  };

  const goToLightboxImage = (index: number) => {
    const track = lightboxTrackRef.current;
    if (!track) return;

    track.scrollTo({ left: track.clientWidth * index, behavior: 'smooth' });
  };

  const handleLightboxScroll = () => {
    if (lightboxFrame.current) return;

    lightboxFrame.current = requestAnimationFrame(() => {
      lightboxFrame.current = 0;

      const track = lightboxTrackRef.current;
      if (!track || track.clientWidth === 0) return;

      setActiveImage(Math.round(track.scrollLeft / track.clientWidth));
    });
  };

  // The arrows show themselves when there's a sign of interest — the pointer
  // moving over the artwork, a swipe, a tap — and fade back out once that
  // stops. Hover alone wouldn't do: a touch device never hovers, so they'd
  // either be invisible there or permanently painted over the work.
  const revealArrows = () => {
    setArrowsVisible(true);
    window.clearTimeout(arrowTimer.current);
    arrowTimer.current = window.setTimeout(
      () => setArrowsVisible(false),
      ARROW_IDLE_MS,
    );
  };

  const handleTrackScroll = () => {
    revealArrows();

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


  if (loading) {
    return (
      <div>
        <div className={styles.grid}>
          <div className={styles.imageWrap}>
            <button
              onClick={() => router.back()}
              className={styles.backButton}
              aria-label={t('backAria')}
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

  if (!painting) return <p className={styles.muted}>{t('notFound')}</p>;

  const price = Number(painting.price);
  const title = pickLocale(painting, 'title', locale);
  const description = pickLocale(painting, 'description', locale);

  // Product structured data — lets search engines show the painting as a rich
  // result (name, image, price, availability).
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    image: images,
    ...(description ? { description } : {}),
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
          <div
            className={styles.imageWrap}
            onPointerMove={revealArrows}
            onPointerLeave={() => setArrowsVisible(false)}
          >
            <button
              onClick={() => router.back()}
              className={styles.backButton}
              aria-label={t('backAria')}
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
                  onClick={openLightbox}
                  className={styles.slide}
                  aria-label={t('openImageAria', { n: index + 1 })}
                >
                  <img
                    src={cdnImage(url, 1400)}
                    alt={index === 0 ? title : ''}
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
                  className={`${styles.navArrow} ${styles.navArrowLeft} ${
                    arrowsVisible ? styles.visible : ''
                  }`}
                  aria-label={t('prevImageAria')}
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
                  className={`${styles.navArrow} ${styles.navArrowRight} ${
                    arrowsVisible ? styles.visible : ''
                  }`}
                  aria-label={t('nextImageAria')}
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
                  aria-label={t('thumbAria', { n: index + 1 })}
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
            <h1 className={styles.title}>{title}</h1>
            <LikeButton
              paintingId={painting.id}
              likesCount={painting.likesCount}
            />
          </div>

          {!!authorName && <p className={styles.author}>{authorName}</p>}

          <p className={styles.price}>{formatPrice(price, locale, usdRate)}</p>

          {/* Three states, not two. In stock is always a purchase — buying the
              work that exists beats commissioning a copy of it. Sold splits on
              whether the artist will paint it again: an offer to order one, or
              a plain statement that it's gone. */}
          {painting.isAvailable ? (
            <button
              onClick={() => addToCart.mutate(painting)}
              className={styles.buyButton}
            >
              {t('buy')}
            </button>
          ) : painting.isRepeatable ? (
            <button
              onClick={() => setCommissionOpen(true)}
              className={styles.buyButton}
            >
              {t('order')}
            </button>
          ) : (
            // Not a disabled button: there is nothing to press, and a greyed
            // one invites the attempt anyway.
            <p className={styles.soldNotice}>{t('sold')}</p>
          )}

          <SectionHeader
            title={t('sections.description')}
            open={isDescOpen}
            onClick={() => setIsDescOpen((prev) => !prev)}
            spacing="lg"
          />
          {isDescOpen && <p className={styles.description}>{description}</p>}

          <SectionHeader
            title={t('sections.characteristics')}
            open={isCharOpen}
            onClick={() => setIsCharOpen((prev) => !prev)}
            spacing="sm"
          />
          {isCharOpen && (
            <dl className={styles.specList}>
              {!!authorName && <Row label={t('specs.author')} value={authorName} />}
              {painting.year && (
                <Row label={t('specs.year')} value={String(painting.year)} />
              )}
              {painting.technique && (
                <Row
                  label={t('specs.technique')}
                  value={pickLocale(painting.technique, 'name', locale)}
                />
              )}
              {painting.material && (
                <Row
                  label={t('specs.material')}
                  value={pickLocale(painting.material, 'name', locale)}
                />
              )}
              {painting.width && painting.height && (
                <Row
                  label={t('specs.size')}
                  value={`${painting.width} × ${painting.height} ${t('sizeUnit')}`}
                />
              )}
            </dl>
          )}

          {/* Under the characteristics, because that's what it is: a fact
              about the work, alongside its size and technique. */}
          <p
            className={`${styles.edition} ${
              painting.isRepeatable ? styles.editionRepeatable : ''
            }`}
          >
            {painting.isRepeatable ? t('edition.repeatable') : t('edition.unique')}
          </p>
        </div>
      </div>

      {/* Admin-only, and placed here on purpose: a series is usually noticed
          while looking at one painting, so the control belongs next to the
          work rather than three screens away in the admin panel. */}
      {user?.role === 'ADMIN' && <PaintingSeriesControl painting={painting} />}

      {interiorImages.length > 0 && (
        <section className={styles.interior}>
          <h2 className={styles.interiorTitle}>{t('interior.title')}</h2>
          <p className={styles.interiorHint}>{t('interior.hint')}</p>
          <InteriorCarousel images={interiorImages} />
        </section>
      )}

      {painting.animation3dImage && (
        <section className={styles.animation3d}>
          <h2 className={styles.animation3dTitle}>{t('animation3d.title')}</h2>
          <Painting3DViewer imageUrl={painting.animation3dImage} title={title} />
        </section>
      )}

      {related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedTitle}>{t('related')}</h2>
          <div className={styles.relatedGrid}>
            {related.map((item) => (
              <PaintingCard key={item.id} painting={item} compact />
            ))}
          </div>
        </section>
      )}

      {commissionOpen && (
        <CommissionModal
          painting={painting}
          onClose={() => setCommissionOpen(false)}
        />
      )}

      {lightboxOpen && (
        <div
          // Only the backdrop itself closes. Anything inside — the photo, the
          // arrows — must not, or a swipe that ends on the image would shut
          // the whole thing.
          onClick={(event) => {
            if (event.target === event.currentTarget) closeLightbox();
          }}
          className={styles.lightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className={styles.lightboxClose}
            aria-label={t('closeAria')}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div
            ref={lightboxTrackRef}
            onScroll={handleLightboxScroll}
            className={styles.lightboxTrack}
          >
            {images.map((url, index) => (
              <div key={url} className={styles.lightboxSlide}>
                <img
                  src={url}
                  alt={index === activeImage ? title : ''}
                  aria-hidden={index === activeImage ? undefined : 'true'}
                  className={styles.lightboxImage}
                />
              </div>
            ))}
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  goToLightboxImage(
                    (activeImage - 1 + images.length) % images.length,
                  )
                }
                className={`${styles.navArrow} ${styles.navArrowLeft} ${styles.visible}`}
                aria-label={t('prevImageAria')}
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
                  goToLightboxImage((activeImage + 1) % images.length)
                }
                className={`${styles.navArrow} ${styles.navArrowRight} ${styles.visible}`}
                aria-label={t('nextImageAria')}
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

              <span className={styles.lightboxCount}>
                {activeImage + 1} / {images.length}
              </span>
            </>
          )}
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
