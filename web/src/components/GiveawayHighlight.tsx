import { Link } from 'react-router-dom';

import type { Giveaway } from '../types/giveaway.types';
import styles from './GiveawayHighlight.module.scss';
import { cdnImage } from '../utils/imageUrl';

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function GiveawayHighlightSkeleton() {
  return <div className={styles.skeleton} />;
}

export default function GiveawayHighlight({
  giveaway,
}: {
  giveaway: Giveaway;
}) {
  const days = daysLeft(giveaway.deadline);

  return (
    <Link to={`/giveaways/${giveaway.id}`} className={styles.banner}>
      <div className={styles.imageWrap}>
        <img
          src={cdnImage(giveaway.painting.cardImage, 900)}
          alt={giveaway.painting.title}
          className={styles.image}
        />
        <span className={styles.daysBadge}>
          {days > 0 ? `${days} дн.` : 'Завершується'}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.top}>
          <h2 className={styles.title}>{giveaway.title}</h2>
          <span className={styles.prize}>Приз: {giveaway.painting.title}</span>
          <p className={styles.description}>{giveaway.description}</p>
        </div>

        <div className={styles.bottom}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <svg viewBox="0 0 24 24" fill="none" className={styles.statIcon}>
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
              <span>{giveaway.participantsCount}</span>
            </div>

            <div className={styles.stat}>
              <svg viewBox="0 0 24 24" fill="none" className={styles.statIcon}>
                <circle
                  cx="12"
                  cy="12"
                  r="8.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M12 7.5V12l3 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>До {formatDeadline(giveaway.deadline)}</span>
            </div>
          </div>

          <span className={styles.ctaButton}>Взяти участь →</span>
        </div>
      </div>
    </Link>
  );
}
