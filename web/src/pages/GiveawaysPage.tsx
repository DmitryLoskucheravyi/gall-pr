import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { giveawaysService } from '../api/giveaways.api';
import type { Giveaway } from '../types/giveaway.types';
import Skeleton from '../components/ui/Skeleton';
import styles from './GiveawaysPage.module.scss';

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function GiveawaysPage() {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    giveawaysService
      .getGiveaways()
      .then(setGiveaways)
      .catch(() => setGiveaways([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className={styles.title}>Розіграші картин</h1>
      <p className={styles.subtitle}>
        Візьміть участь і виграйте оригінальну роботу
      </p>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className={styles.image} />
          ))}
        </div>
      ) : giveaways.length === 0 ? (
        <p className={styles.muted}>Розіграшів поки немає</p>
      ) : (
        <div className={styles.grid}>
          {giveaways.map((giveaway) => (
            <Link
              key={giveaway.id}
              to={`/giveaways/${giveaway.id}`}
              className={styles.card}
            >
              <img
                src={giveaway.painting.cardImage}
                alt={giveaway.painting.title}
                className={styles.image}
              />

              {!giveaway.isActive && (
                <span className={styles.finishedBadge}>Завершено</span>
              )}

              <div className={styles.body}>
                <h2 className={styles.cardTitle}>{giveaway.title}</h2>
                <p className={styles.cardMeta}>
                  {giveaway.isActive ? 'До ' : 'Завершився '}
                  {formatDeadline(giveaway.deadline)}
                </p>
                <p className={styles.cardParticipants}>
                  <svg viewBox="0 0 24 24" fill="none" className={styles.personIcon}>
                    <circle
                      cx="12"
                      cy="8"
                      r="3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M4.5 19.5c1.4-3.1 4.3-5 7.5-5s6.1 1.9 7.5 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  {giveaway.participantsCount}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
