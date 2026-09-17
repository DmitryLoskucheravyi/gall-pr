import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from './ui/LocalizedLink';
import type { Giveaway } from '../types/giveaway.types';
import { useLocale, type Locale } from '../hooks/useLocale';
import { pickLocale } from '../utils/localizedField';
import styles from './GiveawayHighlight.module.scss';
import { cdnImage } from '../utils/imageUrl';
import { plural, pluralForms } from '../utils/plural';

function formatDeadline(iso: string, locale: Locale) {
  return new Date(iso).toLocaleString(locale === 'en' ? 'en-GB' : 'uk-UA', {
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
  const { t } = useTranslation('giveaway');
  const locale = useLocale();
  const title = pickLocale(giveaway, 'title', locale);
  const paintingTitle = pickLocale(giveaway.painting, 'title', locale);
  const description = pickLocale(giveaway, 'description', locale);
  const days = daysLeft(giveaway.deadline);
  const closing = days === 0;

  return (
    <Link to={`/giveaways/${giveaway.id}`} className={styles.card}>
      <div className={styles.media}>
        <img
          src={cdnImage(giveaway.painting.cardImage, 900)}
          alt={paintingTitle}
          className={styles.image}
          loading="lazy"
          decoding="async"
        />
        <span className={styles.mediaFade} aria-hidden="true" />
      </div>

      <div className={styles.body}>
        <span className={styles.kicker}>
          <span className={styles.dot} aria-hidden="true" />
          {t('highlight.kicker')}
        </span>

        <h2 className={styles.title}>{title}</h2>

        <p className={styles.prize}>
          <span className={styles.prizeLabel}>{t('highlight.prizeLabel')}</span>
          <span className={styles.prizeName}>{paintingTitle}</span>
        </p>

        <p className={styles.description}>{description}</p>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <strong>{giveaway.participantsCount}</strong>{' '}
            {plural(giveaway.participantsCount, locale, pluralForms(t, 'participants'))}
          </span>
          <span className={styles.metaItem}>
            {t('highlight.until', { date: formatDeadline(giveaway.deadline, locale) })}
          </span>
        </div>
      </div>

      {/* The tear-off stub: what you'd keep if this were a real ticket — how
          long is left, and the way in. Separated from the body by a
          perforation rather than a plain rule. */}
      <div className={styles.stub}>
        <span className={styles.countdown}>
          {closing ? (
            <span className={styles.countdownClosing}>{t('highlight.lastDay')}</span>
          ) : (
            <>
              <span className={styles.countdownNumber}>{days}</span>
              <span className={styles.countdownUnit}>
                {plural(days, locale, pluralForms(t, 'days'))}
              </span>
            </>
          )}
        </span>

        <span className={styles.cta}>
          {t('highlight.cta')}
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
