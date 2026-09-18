'use client';

import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useGiveaway, useGiveawayMyStatus } from '../hooks/queries/useGiveaway';
import { useGiveawayJoinMutation } from '../hooks/mutations/useGiveawayJoinMutation';
import { useAppSelector } from '../store/hooks';
import { useLocale, type Locale } from '../hooks/useLocale';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { pickLocale } from '../utils/localizedField';
import { cdnImage } from '../utils/imageUrl';
import { plural, pluralForms } from '../utils/plural';
import styles from './GiveawayDetailPage.module.scss';

function formatDeadline(iso: string, locale: Locale) {
  return new Date(iso).toLocaleString(locale === 'en' ? 'en-GB' : 'uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// How much of the giveaway's own window has already gone. Drawn as a hairline
// under the countdown: "7 днів" means nothing on its own until you can see
// whether that is most of the run or the tail of it.
function elapsedFraction(createdAt: string, deadline: string) {
  const start = new Date(createdAt).getTime();
  const end = new Date(deadline).getTime();
  if (!(end > start)) return 1;
  return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
}

export default function GiveawayDetailPage() {
  const { t } = useTranslation('giveaway');
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const navigate = useLocalizedNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const giveawayId = id ? Number(id) : undefined;
  const { data: giveaway, isLoading: loading } = useGiveaway(giveawayId);
  const { data: myStatus } = useGiveawayMyStatus(giveawayId);
  const joinMutation = useGiveawayJoinMutation();

  const joined = myStatus?.joined ?? false;

  const handleJoin = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!giveaway) return;

    joinMutation.mutate(giveaway.id);
  };

  if (loading) {
    return (
      <div className={styles.grid}>
        <div className={styles.frameSkeleton} />
        <div className={styles.sideSkeleton} />
      </div>
    );
  }

  if (!giveaway) {
    return <p className={styles.muted}>{t('detail.notFound')}</p>;
  }

  const { painting } = giveaway;
  const days = daysLeft(giveaway.deadline);
  const active = giveaway.isActive;
  const progress = elapsedFraction(giveaway.createdAt, giveaway.deadline);
  const title = pickLocale(giveaway, 'title', locale);
  const description = pickLocale(giveaway, 'description', locale);
  const conditions = pickLocale(giveaway, 'conditions', locale);
  const paintingTitle = pickLocale(painting, 'title', locale);
  const paintingSubtitle = painting.subtitle
    ? pickLocale(painting, 'subtitle', locale)
    : undefined;
  const paintingDescription = painting.description
    ? pickLocale(painting, 'description', locale)
    : undefined;

  return (
    <div className={styles.grid}>
      {/* The work itself, on its own mount — the prize is the reason for the
          page, so it opens it. */}
      <figure className={styles.work}>
        <div className={styles.frame}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={styles.backButton}
            aria-label={t('detail.backAria')}
          >
            <svg viewBox="0 0 24 24" fill="none" className={styles.backIcon}>
              <path
                d="M19 12H6m0 0 5-5m-5 5 5 5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <img
            src={cdnImage(painting.cardImage, 1200)}
            alt={paintingTitle}
            className={styles.image}
            decoding="async"
          />
        </div>

        <figcaption className={styles.workMeta}>
          <span className={styles.workLabel}>{t('detail.prizeLabel')}</span>
          <h2 className={styles.workTitle}>{paintingTitle}</h2>
          {paintingSubtitle && (
            <p className={styles.workSubtitle}>{paintingSubtitle}</p>
          )}
          {paintingDescription && (
            <p className={styles.workText}>{paintingDescription}</p>
          )}
        </figcaption>
      </figure>

      <aside className={styles.side}>
        <h1 className={styles.title}>{title}</h1>

        {/* Same ticket as the home page, stood upright: countdown above the
            perforation, the way in below it. */}
        <div className={styles.ticket}>
          <div className={styles.ticketHead}>
            <span className={styles.ticketLabel}>
              {active ? t('detail.untilEnd') : t('detail.ended')}
            </span>

            {active ? (
              <span className={styles.countdown}>
                {days === 0 ? (
                  <span className={styles.countdownClosing}>{t('detail.lastDay')}</span>
                ) : (
                  <>
                    <span className={styles.countdownNumber}>{days}</span>
                    <span className={styles.countdownUnit}>
                      {plural(days, locale, pluralForms(t, 'days'))}
                    </span>
                  </>
                )}
              </span>
            ) : (
              <span className={styles.countdownClosing}>{t('detail.finished')}</span>
            )}

            <span className={styles.deadline}>
              {formatDeadline(giveaway.deadline, locale)}
            </span>

            {active && (
              <span className={styles.progress} aria-hidden="true">
                <span
                  className={styles.progressFill}
                  style={{ transform: `scaleX(${progress})` }}
                />
              </span>
            )}
          </div>

          <div className={styles.ticketStub}>
            <span className={styles.participants}>
              <strong>{giveaway.participantsCount}</strong>{' '}
              {plural(giveaway.participantsCount, locale, pluralForms(t, 'participants'))}
            </span>

            {!active ? (
              <p className={styles.finishedNote}>{t('detail.closed')}</p>
            ) : joined ? (
              <p className={styles.joinedNote}>
                <svg viewBox="0 0 24 24" fill="none" className={styles.tick}>
                  <path
                    d="m5 12.5 4.5 4.5L19 7.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t('detail.joined')}
              </p>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinMutation.isPending}
                className={styles.joinButton}
              >
                {joinMutation.isPending ? t('detail.wait') : t('detail.join')}
              </button>
            )}
          </div>
        </div>
      </aside>

      {(description || conditions) && (
        <div className={styles.blocks}>
          {description && (
            <section className={styles.block}>
              <h3 className={styles.blockTitle}>{t('detail.about')}</h3>
              <p className={styles.blockText}>{description}</p>
            </section>
          )}

          {conditions && (
            <section className={styles.block}>
              <h3 className={styles.blockTitle}>{t('detail.conditions')}</h3>
              <p className={styles.blockText}>{conditions}</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
