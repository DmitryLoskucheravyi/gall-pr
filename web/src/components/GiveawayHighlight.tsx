import { Link } from 'react-router-dom';

import type { Giveaway } from '../types/giveaway.types';
import styles from './GiveawayHighlight.module.scss';
import { cdnImage } from '../utils/imageUrl';
import { plural } from '../utils/plural';

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
  const closing = days === 0;

  return (
    <Link to={`/giveaways/${giveaway.id}`} className={styles.card}>
      <div className={styles.media}>
        <img
          src={cdnImage(giveaway.painting.cardImage, 900)}
          alt={giveaway.painting.title}
          className={styles.image}
          loading="lazy"
          decoding="async"
        />
        <span className={styles.mediaFade} aria-hidden="true" />
      </div>

      <div className={styles.body}>
        <span className={styles.kicker}>
          <span className={styles.dot} aria-hidden="true" />
          Розіграш
        </span>

        <h2 className={styles.title}>{giveaway.title}</h2>

        <p className={styles.prize}>
          <span className={styles.prizeLabel}>Приз</span>
          <span className={styles.prizeName}>{giveaway.painting.title}</span>
        </p>

        <p className={styles.description}>{giveaway.description}</p>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <strong>{giveaway.participantsCount}</strong>{' '}
            {plural(
              giveaway.participantsCount,
              'учасник',
              'учасники',
              'учасників',
            )}
          </span>
          <span className={styles.metaItem}>
            до {formatDeadline(giveaway.deadline)}
          </span>
        </div>
      </div>

      {/* The tear-off stub: what you'd keep if this were a real ticket — how
          long is left, and the way in. Separated from the body by a
          perforation rather than a plain rule. */}
      <div className={styles.stub}>
        <span className={styles.countdown}>
          {closing ? (
            <span className={styles.countdownClosing}>Останній день</span>
          ) : (
            <>
              <span className={styles.countdownNumber}>{days}</span>
              <span className={styles.countdownUnit}>
                {plural(days, 'день', 'дні', 'днів')}
              </span>
            </>
          )}
        </span>

        <span className={styles.cta}>
          Взяти участь
          <svg viewBox="0 0 24 24" fill="none" className={styles.ctaIcon}>
            <path
              d="M5 12h13m0 0-5-5m5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </Link>
  );
}
