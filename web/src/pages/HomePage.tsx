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
import ScrollBrushArt from '../components/ScrollBrushArt';
import styles from './HomePage.module.scss';

export default function HomePage() {
  const { data: paintingsResponse, isLoading: loading } = usePaintings({
    page: 1,
    limit: 200,
    isAvailable: true,
  });
  const { data: giveaways, isLoading: giveawayLoading } = useGiveaways();
  const { data: news, isLoading: newsLoading } = useNews();

  const featured = (paintingsResponse?.data ?? []).filter((p) => p.isFeatured);

  const giveaway =
    (giveaways ?? [])
      .filter((item) => item.isActive)
      .sort(
        (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
      )[0] ?? null;

  const latestNews = news?.[0] ?? null;

  return (
    <div>
      <ScrollBrushArt />

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Галерея сучасного мистецтва</span>
        <h1 className={styles.title}>Мистецтво, що говорить</h1>
        <div className={styles.rule} />
        <p className={styles.subtitle}>
          Кураторська добірка оригінальних картин від українських художників
        </p>
        <Link to="/catalog" className={styles.ctaButton}>
          Переглянути каталог
        </Link>
      </section>

      {newsLoading ? (
        <section className={styles.giveawaySection}>
          <NewsBannerSkeleton />
        </section>
      ) : latestNews ? (
        <section className={styles.giveawaySection}>
          <NewsBanner news={latestNews} />
        </section>
      ) : null}

      {giveawayLoading ? (
        <section className={styles.giveawaySection}>
          <GiveawayHighlightSkeleton />
        </section>
      ) : giveaway ? (
        <section className={styles.giveawaySection}>
          <GiveawayHighlight giveaway={giveaway} />
        </section>
      ) : null}

      <div className={styles.fillerSection} />

      <section className={styles.featuredSection}>
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

      <div className={styles.fillerSection} />
    </div>
  );
}
