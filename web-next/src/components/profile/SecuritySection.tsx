import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authService } from '../../api/auth.api';
import type { ChangePasswordDto } from '../../types/auth.types';
import { apiErrorMessage } from '../../utils/apiError';
import { useAppDispatch } from '../../store/hooks';
import { showToast } from '../../store/slices/toastSlice';
import { logout } from '../../store/slices/authSlice';
import { useConfirm } from '../ui/ConfirmDialog';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import styles from './SecuritySection.module.scss';

const MIN_PASSWORD_LENGTH = 8;

// A User-Agent string is long, client-supplied and unreadable. Reduced to the
// two things a person actually recognises about their own device — never
// rendered as anything but text.
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return '—';

  const browser =
    /Edg\//.test(userAgent) ? 'Edge'
    : /OPR\//.test(userAgent) ? 'Opera'
    : /Firefox\//.test(userAgent) ? 'Firefox'
    : /Chrome\//.test(userAgent) ? 'Chrome'
    : /Safari\//.test(userAgent) ? 'Safari'
    : null;

  const platform =
    /Android/.test(userAgent) ? 'Android'
    : /iPhone|iPad|iPod/.test(userAgent) ? 'iOS'
    : /Mac OS X/.test(userAgent) ? 'macOS'
    : /Windows/.test(userAgent) ? 'Windows'
    : /Linux/.test(userAgent) ? 'Linux'
    : null;

  return [browser, platform].filter(Boolean).join(' · ') || '—';
}

// Two things that had no home anywhere in the app: changing your password, and
// seeing where you are signed in. Neither was possible before sessions became
// rows — the refresh token was one column on the account, so "signed in" had no
// plural.
export default function SecuritySection() {
  const { t } = useTranslation('profile');
  const dispatch = useAppDispatch();
  const navigate = useLocalizedNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sessions = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => authService.getSessions(),
  });

  const changePassword = useMutation({
    mutationFn: (dto: ChangePasswordDto) => authService.changePassword(dto),
    onSuccess: (result) => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      dispatch(showToast({ message: result.message }));
      // Every other device was just signed out, so the list is stale.
      void queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
    onError: (err: unknown) => {
      setError(apiErrorMessage(err, t('security.password.error')));
    },
  });

  const endSession = useMutation({
    mutationFn: (id: number) => authService.endSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      dispatch(showToast({ message: t('security.sessions.ended') }));
    },
    onError: (err: unknown) => {
      dispatch(
        showToast({
          message: apiErrorMessage(err, t('security.sessions.endError')),
          variant: 'error',
        }),
      );
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // The server never sees the confirmation field, so this check can only
    // happen here.
    if (newPassword !== confirmPassword) {
      setError(t('security.password.mismatch'));
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t('security.password.tooShort'));
      return;
    }

    changePassword.mutate({ currentPassword, newPassword });
  };

  const handleLogoutEverywhere = async () => {
    const ok = await confirm({
      title: t('security.sessions.confirmAll.title'),
      message: t('security.sessions.confirmAll.message'),
      confirmLabel: t('security.sessions.confirmAll.confirmLabel'),
      danger: true,
    });
    if (!ok) return;

    await authService.logoutEverywhere().catch(() => {});
    // This device included — that is what "everywhere" means, and the cookie
    // is already gone, so staying on a signed-in-looking page would be a lie.
    dispatch(logout());
    navigate('/login');
  };

  const rows = sessions.data ?? [];

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{t('security.title')}</h2>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{t('security.password.title')}</h3>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>
                {t('security.password.current')}
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{t('security.password.next')}</span>
              <input
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>
                {t('security.password.repeat')}
              </span>
              <input
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <p className={styles.hint}>{t('security.password.hint')}</p>

            <button
              type="submit"
              disabled={changePassword.isPending}
              className={styles.submit}
            >
              {changePassword.isPending
                ? t('security.password.saving')
                : t('security.password.submit')}
            </button>
          </form>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{t('security.sessions.title')}</h3>

          {sessions.isLoading ? (
            <p className={styles.muted}>{t('security.sessions.loading')}</p>
          ) : rows.length === 0 ? (
            <p className={styles.muted}>{t('security.sessions.empty')}</p>
          ) : (
            <ul className={styles.sessions}>
              {rows.map((session) => (
                <li key={session.id} className={styles.session}>
                  <div>
                    <p className={styles.device}>
                      {describeDevice(session.userAgent)}
                      {session.isCurrent && (
                        <span className={styles.currentBadge}>
                          {t('security.sessions.current')}
                        </span>
                      )}
                    </p>
                    <p className={styles.since}>
                      {t('security.sessions.since', {
                        date: new Date(session.createdAt).toLocaleDateString(),
                      })}
                    </p>
                  </div>

                  {!session.isCurrent && (
                    <button
                      type="button"
                      onClick={() => endSession.mutate(session.id)}
                      disabled={endSession.isPending}
                      className={styles.endButton}
                    >
                      {t('security.sessions.end')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={handleLogoutEverywhere}
            className={styles.dangerButton}
          >
            {t('security.sessions.endAll')}
          </button>
        </div>
      </div>
    </section>
  );
}
