import { useNavigate, useParams } from 'react-router-dom';

import { useGiveaway, useGiveawayMyStatus } from '../hooks/queries/useGiveaway';
import { useGiveawayJoinMutation } from '../hooks/mutations/useGiveawayJoinMutation';
import { useAppSelector } from '../store/hooks';
import { cdnImage } from '../utils/imageUrl';
import { plural } from '../utils/plural';
import styles from './GiveawayDetailPage.module.scss';

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleString('uk-UA', {
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
    return <p className={styles.muted}>Розіграш не знайдено</p>;
  }

  const { painting } = giveaway;
  const days = daysLeft(giveaway.deadline);
  const active = giveaway.isActive;
  const progress = elapsedFraction(giveaway.createdAt, giveaway.deadline);

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
            aria-label="Назад"
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
            alt={painting.title}
            className={styles.image}
            decoding="async"
          />
        </div>

        <figcaption className={styles.workMeta}>
          <span className={styles.workLabel}>Приз</span>
          <h2 className={styles.workTitle}>{painting.title}</h2>
          {painting.subtitle && (
            <p className={styles.workSubtitle}>{painting.subtitle}</p>
          )}
          {painting.description && (
            <p className={styles.workText}>{painting.description}</p>
          )}
        </figcaption>
      </figure>

      <aside className={styles.side}>
        <h1 className={styles.title}>{giveaway.title}</h1>

        {/* Same ticket as the home page, stood upright: countdown above the
            perforation, the way in below it. */}
        <div className={styles.ticket}>
          <div className={styles.ticketHead}>
            <span className={styles.ticketLabel}>
              {active ? 'До завершення' : 'Розіграш завершився'}
            </span>

            {active ? (
              <span className={styles.countdown}>
                {days === 0 ? (
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
            ) : (
              <span className={styles.countdownClosing}>Завершено</span>
            )}

            <span className={styles.deadline}>
              {formatDeadline(giveaway.deadline)}
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
              {plural(
                giveaway.participantsCount,
                'учасник',
                'учасники',
                'учасників',
              )}
            </span>

            {!active ? (
              <p className={styles.finishedNote}>Прийом заявок закрито</p>
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
                Ви берете участь
              </p>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinMutation.isPending}
                className={styles.joinButton}
              >
                {joinMutation.isPending ? 'Зачекайте…' : 'Взяти участь'}
              </button>
            )}
          </div>
        </div>
      </aside>

      {(giveaway.description || giveaway.conditions) && (
        <div className={styles.blocks}>
          {giveaway.description && (
            <section className={styles.block}>
              <h3 className={styles.blockTitle}>Про розіграш</h3>
              <p className={styles.blockText}>{giveaway.description}</p>
            </section>
          )}

          {giveaway.conditions && (
            <section className={styles.block}>
              <h3 className={styles.blockTitle}>Умови участі</h3>
              <p className={styles.blockText}>{giveaway.conditions}</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
