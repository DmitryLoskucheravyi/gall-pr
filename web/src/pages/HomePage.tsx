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
import styles from './HomePage.module.scss';

const MARQUEE_ITEMS = [
  'Оригінальні роботи',
  'Єдиний екземпляр',
  'Живопис ручної роботи',
  'Кураторська добірка',
  'Доставка по Україні',
];

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
  const heroArt = (featured.length >= 3 ? featured : paintings).slice(0, 3);
  const totalWorks = paintingsResponse?.total ?? 0;

  const giveaway =
    (giveaways ?? [])
      .filter((item) => item.isActive)
      .sort(
        (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
      )[0] ?? null;

  const latestNews = news?.[0] ?? null;

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
        <section className={styles.section}>
          <NewsBanner news={latestNews} />
        </section>
      ) : null}

      {giveawayLoading ? (
        <section className={styles.section}>
          <GiveawayHighlightSkeleton />
        </section>
      ) : giveaway ? (
        <section className={styles.section}>
          <GiveawayHighlight giveaway={giveaway} />
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
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
        </div>

        {loading ? (
          <FeaturedStackSkeleton />
        ) : featured.length > 0 ? (
          <FeaturedStack paintings={featured} />
        ) : (
          <p className={styles.muted}>Скоро тут з'являться нові роботи</p>
        )}
      </section>

      <section className={styles.values}>
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
      </section>

      <section className={styles.ctaBand}>
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
      </section>
    </div>
  );
}
