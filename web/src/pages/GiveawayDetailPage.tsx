import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { giveawaysService } from '../api/giveaways.api';
import type { Giveaway } from '../types/giveaway.types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { showToast } from '../store/slices/toastSlice';
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

export default function GiveawayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [giveaway, setGiveaway] = useState<Giveaway | null>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    giveawaysService
      .getGiveaway(Number(id))
      .then(setGiveaway)
      .catch(() => setGiveaway(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;

    giveawaysService
      .getMyStatus(Number(id))
      .then(({ joined }) => setJoined(joined))
      .catch(() => {});
  }, [id, user]);

  const handleJoin = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!giveaway) return;

    try {
      setJoining(true);
      const result = await giveawaysService.join(giveaway.id);
      setJoined(true);
      setGiveaway((prev) =>
        prev ? { ...prev, participantsCount: result.participantsCount } : prev,
      );
      dispatch(showToast({ message: 'Ви берете участь у розіграші!' }));
    } catch (error: any) {
      dispatch(
        showToast({
          message:
            error?.response?.data?.message ?? 'Не вдалося приєднатись',
          variant: 'error',
        }),
      );
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <p className={styles.muted}>Завантаження…</p>;
  if (!giveaway) return <p className={styles.muted}>Розіграш не знайдено</p>;

  return (
    <div>
      <button onClick={() => navigate(-1)} className={styles.backButton}>
        ← Назад
      </button>

      <h1 className={styles.title}>{giveaway.title}</h1>

      <div className={styles.grid}>
        <img
          src={giveaway.painting.cardImage}
          alt={giveaway.painting.title}
          className={styles.image}
        />

        <div>
          <h2 className={styles.paintingTitle}>{giveaway.painting.title}</h2>
          <p className={styles.paintingDescription}>
            {giveaway.painting.description}
          </p>

          <div className={styles.deadlineBox}>
            <span className={styles.deadlineLabel}>
              {giveaway.isActive ? 'Розіграш до' : 'Розіграш завершився'}
            </span>
            <span className={styles.deadlineValue}>
              {formatDeadline(giveaway.deadline)}
            </span>
          </div>

          <p className={styles.participants}>
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

          <p className={styles.description}>{giveaway.description}</p>

          {giveaway.conditions && (
            <div className={styles.conditionsBox}>
              <h3 className={styles.conditionsTitle}>Умови участі</h3>
              <p className={styles.conditionsText}>{giveaway.conditions}</p>
            </div>
          )}

          {!giveaway.isActive ? (
            <p className={styles.finishedNote}>Розіграш завершено</p>
          ) : joined ? (
            <button disabled className={styles.joinedButton}>
              Ви берете участь ✓
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={joining}
              className={styles.joinButton}
            >
              {joining ? 'Зачекайте…' : 'Взяти участь'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
