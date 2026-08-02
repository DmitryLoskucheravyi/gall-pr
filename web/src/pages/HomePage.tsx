import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { usePaintings } from '../hooks/queries/usePaintings';
import { useGiveaways } from '../hooks/queries/useGiveaways';
import { useNews } from '../hooks/queries/useNews';
import FeaturedStack, {
  FeaturedStackSkeleton,
} from '../components/FeaturedStack';
import GiveawayHighlight, {
  GiveawayHighlightSkeleton,
} from '../components/GiveawayHighlight';
import NewsBanner, { NewsBannerSkeleton } from '../components/NewsBanner';
import Skeleton from '../components/ui/Skeleton';
import Reveal from '../components/ui/Reveal';
import styles from './HomePage.module.scss';

const MARQUEE_ITEMS = [
  'Оригінальні роботи',
  'Єдиний екземпляр',
  'Живопис ручної роботи',
  'Кураторська добірка',
  'Доставка по Україні',
];

// The four corners the hero's Ken Burns tour visits, in %-of-image-box units
// (see --pan-x*/--pan-y* in HomePage.module.scss). Shuffled fresh each pan
// cycle so the tour doesn't always start top-left and go clockwise.
const HERO_CORNERS: Array<[string, string]> = [
  ['-9%', '-9%'],
  ['9%', '-9%'],
  ['9%', '9%'],
  ['-9%', '9%'],
];

function shuffledCorners(): Array<[string, string]> {
  const corners = [...HERO_CORNERS];
  for (let i = corners.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [corners[i], corners[j]] = [corners[j], corners[i]];
  }
  return corners;
}

export default function HomePage() {
  const { data: paintingsResponse, isLoading: loading } = usePaintings({
    page: 1,
    limit: 200,
    isAvailable: true,
  });
  const { data: giveaways, isLoading: giveawayLoading } = useGiveaways();
  const { data: news, isLoading: newsLoading } = useNews();

  const paintings = paintingsResponse?.data ?? [];
  const featured = paintings.filter((p) => p.isFeatured);
  // Desktop collage has exactly 3 fixed card slots (heroCardA/B/C) — keep
  // this at 3. The mobile/tablet background rhythm below uses every featured
  // painting instead, uncapped.
  const heroArt = (featured.length >= 3 ? featured : paintings).slice(0, 3);
  const heroBgSlides = featured.length > 0 ? featured : paintings;
  const totalWorks = paintingsResponse?.total ?? 0;

  const giveaway =
    (giveaways ?? [])
      .filter((item) => item.isActive)
      .sort(
        (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
      )[0] ?? null;

  const latestNews = news?.[0] ?? null;

  // Mobile/tablet-only "slot machine" behind the hero (desktop keeps the
  // layered card collage instead — see .heroBg's display:none above
  // $breakpoint-lg). Three horizontal bands, each showing a third of a
  // painting (top/middle/bottom). Bands spin through random decoys one at a
  // time, top to bottom, each guaranteed to settle on the same target
  // painting's matching third — so the three always reassemble into one
  // complete picture. Once assembled, pans/zooms across it for a couple of
  // seconds (see .heroBandImagePanning), then reshuffles and repeats.
  const [bandImages, setBandImages] = useState<[number, number, number]>([0, 0, 0]);
  const [assembled, setAssembled] = useState(false);
  const [panCorners, setPanCorners] = useState(HERO_CORNERS);

  useEffect(() => {
    if (heroBgSlides.length === 0) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (reducedMotion) {
      setBandImages([0, 0, 0]);
      setAssembled(true);
      return;
    }

    let cancelled = false;
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));
    const randomIndex = () => Math.floor(Math.random() * heroBgSlides.length);

    const setBand = (band: 0 | 1 | 2, index: number) => {
      setBandImages((prev) => {
        const next: [number, number, number] = [...prev];
        next[band] = index;
        return next;
      });
    };

    // Pause is as long as the Ken Burns pan needs to read as smooth (see
    // $hero-pan-duration in HomePage.module.scss — keep both in sync) rather
    // than a fixed short beat like the spin.
    const PAN_DURATION_MS = 12000;

    const run = async () => {
      while (!cancelled) {
        setAssembled(false);
        const target = randomIndex();

        for (const band of [0, 1, 2] as const) {
          const beats = 3 + Math.floor(Math.random() * 2); // 3-4 decoys
          for (let i = 0; i < beats; i++) {
            if (cancelled) return;
            setBand(band, randomIndex());
            await sleep(140);
          }
          if (cancelled) return;
          setBand(band, target);
        }

        if (cancelled) return;
        setPanCorners(shuffledCorners());
        setAssembled(true);
        await sleep(PAN_DURATION_MS);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [heroBgSlides.length]);

  const marqueeContent = (
    <>
      {MARQUEE_ITEMS.map((item) => (
        <span key={item} className={styles.marqueeItem}>
          {item}
          <span className={styles.marqueeDot} />
        </span>
      ))}
    </>
  );

  return (
    <div>
      <section className={styles.hero}>
        {!loading && heroBgSlides.length > 0 && (
          <div
            className={styles.heroBg}
            aria-hidden="true"
            style={
              {
                '--pan-x1': panCorners[0][0],
                '--pan-y1': panCorners[0][1],
                '--pan-x2': panCorners[1][0],
                '--pan-y2': panCorners[1][1],
                '--pan-x3': panCorners[2][0],
                '--pan-y3': panCorners[2][1],
                '--pan-x4': panCorners[3][0],
                '--pan-y4': panCorners[3][1],
              } as CSSProperties
            }
          >
            {([0, 1, 2] as const).map((band) => {
              const painting = heroBgSlides[bandImages[band]];
              if (!painting) return null;

              return (
                <div key={band} className={styles.heroBand}>
                  <img
                    src={painting.cardImage}
                    alt=""
                    style={{ top: `${-band * 100}%` }}
                    className={
                      assembled
                        ? `${styles.heroBandImage} ${styles.heroBandImagePanning}`
                        : styles.heroBandImage
                    }
                  />
                </div>
              );
            })}
            <div className={styles.heroOverlay} />
          </div>
        )}

        <div className={styles.heroText}>
          <span className={styles.eyebrow}>Галерея сучасного мистецтва</span>
          <h1 className={styles.title}>
            Мистецтво, що <em>говорить</em>
          </h1>
          <p className={styles.subtitle}>
            Кураторська добірка оригінальних картин від українських художників.
            Кожна робота існує в єдиному екземплярі.
          </p>
          <div className={styles.actions}>
            <Link to="/catalog" className={styles.ctaButton}>
              Переглянути каталог
            </Link>
            <Link to="/gallery" className={styles.ctaGhost}>
              Галерея
            </Link>
          </div>

          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt className={styles.statValue}>
                {loading ? '—' : totalWorks}
              </dt>
              <dd className={styles.statLabel}>робіт у каталозі</dd>
            </div>
            <div className={styles.stat}>
              <dt className={styles.statValue}>100%</dt>
              <dd className={styles.statLabel}>ручна робота</dd>
            </div>
            <div className={styles.stat}>
              <dt className={styles.statValue}>1/1</dt>
              <dd className={styles.statLabel}>єдиний екземпляр</dd>
            </div>
          </dl>
        </div>

        <div className={styles.heroArt}>
          {loading
            ? [styles.heroCardA, styles.heroCardB, styles.heroCardC].map(
                (cls) => (
                  <div key={cls} className={`${styles.heroCard} ${cls}`}>
                    <Skeleton className={styles.heroSkeleton} />
                  </div>
                ),
              )
            : heroArt.map((painting, index) => (
                <Link
                  key={painting.id}
                  to={`/painting/${painting.id}`}
                  className={`${styles.heroCard} ${
                    [styles.heroCardA, styles.heroCardB, styles.heroCardC][
                      index
                    ]
                  }`}
                >
                  <img
                    src={painting.cardImage}
                    alt={painting.title}
                    className={styles.heroImage}
                  />
                  <span className={styles.heroCaption}>{painting.title}</span>
                </Link>
              ))}
        </div>
      </section>

      {/* Opaque wrapper that slides up over the sticky mobile/tablet hero
          as the page scrolls — see .hero's position:sticky. */}
      <div className={styles.pageContent}>
      <div className={styles.marquee} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          {marqueeContent}
          {marqueeContent}
        </div>
      </div>

      {newsLoading ? (
        <section className={styles.section}>
          <NewsBannerSkeleton />
        </section>
      ) : latestNews ? (
        <Reveal as="section" className={styles.section}>
          <NewsBanner news={latestNews} />
        </Reveal>
      ) : null}

      {giveawayLoading ? (
        <section className={styles.section}>
          <GiveawayHighlightSkeleton />
        </section>
      ) : giveaway ? (
        <Reveal as="section" className={styles.section}>
          <GiveawayHighlight giveaway={giveaway} />
        </Reveal>
      ) : null}

      <section className={styles.section}>
        <Reveal className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Рекомендовані</h2>
          <Link
            to="/catalog"
            aria-label="Всі роботи"
            className={styles.sectionLink}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h13M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </Reveal>

        {loading ? (
          <FeaturedStackSkeleton />
        ) : featured.length > 0 ? (
          <FeaturedStack paintings={featured} />
        ) : (
          <p className={styles.muted}>Скоро тут з'являться нові роботи</p>
        )}
      </section>

      <Reveal as="section" className={styles.values}>
        <div className={styles.valueCard}>
          <span className={styles.valueIcon}>
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3c-4 4.5-6 7.5-6 10a6 6 0 0 0 12 0c0-2.5-2-5.5-6-10Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M9.5 13.5a2.5 2.5 0 0 0 2.5 2.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <h3 className={styles.valueTitle}>Оригінальний живопис</h3>
          <p className={styles.valueText}>
            Жодних принтів чи копій — тільки авторські роботи, написані фарбами
            на полотні.
          </p>
        </div>

        <div className={styles.valueCard}>
          <span className={styles.valueIcon}>
            <svg viewBox="0 0 24 24" fill="none">
              <rect
                x="3.5"
                y="6"
                width="13"
                height="11"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M16.5 9.5H19a1.5 1.5 0 0 1 1.2.6l0.8 1.07a1.5 1.5 0 0 1 .3.9v3.43a1.5 1.5 0 0 1-1.5 1.5h-1.3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="8" cy="17" r="1.8" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="17" cy="17" r="1.8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <h3 className={styles.valueTitle}>Доставка Новою поштою</h3>
          <p className={styles.valueText}>
            Надійне пакування і відправка у будь-яке відділення по всій
            Україні.
          </p>
        </div>

        <div className={styles.valueCard}>
          <span className={styles.valueIcon}>
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3.5 5 6.5v5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9v-5l-7-3Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="m9 12 2.2 2.2L15.5 9.8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h3 className={styles.valueTitle}>Зручна оплата</h3>
          <p className={styles.valueText}>
            Оплата при отриманні або переказ на карту — як вам зручніше.
          </p>
        </div>
      </Reveal>

      <Reveal as="section" className={styles.ctaBand}>
        <h2 className={styles.ctaTitle}>
          Знайдіть картину, яка <em>заговорить</em> до вас
        </h2>
        <Link to="/catalog" className={styles.ctaBandButton}>
          До каталогу
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h13M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </Reveal>
      </div>
    </div>
  );
}
