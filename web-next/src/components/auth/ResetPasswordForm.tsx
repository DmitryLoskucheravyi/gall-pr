'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from '../ui/LocalizedLink';
import { authService } from '../../api/auth.api';
import { apiErrorMessage } from '../../utils/apiError';
import styles from './AuthPanel.module.scss';

// Where the link in the reset email lands. The token travels in the query
// string and is never stored anywhere — it goes straight back to the server
// with the new password and is spent there.
const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordForm() {
  const { t } = useTranslation('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Checked here as well as on the server, because the server's answer to a
    // mismatch would be about the password it received, not about the two the
    // person typed — it never sees the second one.
    if (password !== confirm) {
      setError(t('reset.mismatch'));
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('reset.tooShort'));
      return;
    }

    try {
      setLoading(true);
      await authService.resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, t('reset.error')));
    } finally {
      setLoading(false);
    }
  };

  // A link that arrived mangled — cut by a mail client, or opened by hand —
  // says so rather than presenting a form that can only fail.
  if (!token) {
    return (
      <div className={styles.panel}>
        <p className={styles.eyebrow}>{t('reset.eyebrow')}</p>
        <h1 className={styles.title}>{t('reset.title')}</h1>
        <p className={styles.error}>{t('reset.missingToken')}</p>

        <p className={styles.switch}>
          <Link to="/forgot-password" className={styles.switchLink}>
            {t('forgot.submit')}
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.panel}>
        <p className={styles.eyebrow}>{t('reset.eyebrow')}</p>
        <h1 className={styles.title}>{t('reset.doneTitle')}</h1>
        <p className={styles.lead}>{t('reset.doneText')}</p>

        <p className={styles.switch}>
          <Link to="/login" className={styles.switchLink}>
            {t('reset.backToLogin')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <p className={styles.eyebrow}>{t('reset.eyebrow')}</p>
      <h1 className={styles.title}>{t('reset.title')}</h1>
      <p className={styles.lead}>{t('reset.hint')}</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>{t('reset.password')}</span>
          <input
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('reset.confirm')}</span>
          <input
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={styles.input}
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" disabled={loading} className={styles.submit}>
          {loading ? t('reset.wait') : t('reset.submit')}
        </button>
      </form>
    </div>
  );
}
