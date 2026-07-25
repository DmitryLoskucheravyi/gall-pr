import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { paintingsService } from '../api/paintings.api';
import { giveawaysService } from '../api/giveaways.api';
import type { Painting } from '../types/painting.types';
import type { Giveaway } from '../types/giveaway.types';
import FeaturedStack, {
  FeaturedStackSkeleton,
} from '../components/FeaturedStack';
import GiveawayHighlight, {
  GiveawayHighlightSkeleton,
} from '../components/GiveawayHighlight';
import styles from './HomePage.module.scss';

export default function HomePage() {
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);
  const [giveaway, setGiveaway] = useState<Giveaway | null>(null);
  const [giveawayLoading, setGiveawayLoading] = useState(true);

  useEffect(() => {
    paintingsService
      .getPaintings(1, 20, undefined, true)
      .then((response) => setPaintings(response.data))
      .catch(() => setPaintings([]))
      .finally(() => setLoading(false));

    giveawaysService
      .getGiveaways()
      .then((data) => {
        const active = data
          .filter((item) => item.isActive)
          .sort(
            (a, b) =>
              new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
          );
        setGiveaway(active[0] ?? null);
      })
      .catch(() => setGiveaway(null))
      .finally(() => setGiveawayLoading(false));
  }, []);

  const featured = paintings.filter((p) => p.isFeatured).slice(0, 7);

  return (
    <div>
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

      {giveawayLoading ? (
        <section className={styles.giveawaySection}>
          <GiveawayHighlightSkeleton />
        </section>
      ) : giveaway ? (
        <section className={styles.giveawaySection}>
          <GiveawayHighlight giveaway={giveaway} />
        </section>
      ) : null}

      <section>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Featured</h2>
          <Link to="/catalog" className={styles.sectionLink}>
            Всі роботи →
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
    </div>
  );
}
