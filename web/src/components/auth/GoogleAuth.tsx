'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from '../ui/LocalizedLink';
import GoogleButton, { isGoogleAuthEnabled } from './GoogleButton';
import { authService } from '../../api/auth.api';
import { useFinishSignIn } from '../../hooks/useFinishSignIn';
import { apiErrorMessage } from '../../utils/apiError';
import type { GoogleProfile } from '../../types/auth.types';
import styles from './AuthPanel.module.scss';

export type PendingGoogleSignUp = {
  accessToken: string;
  profile: GoogleProfile;
};

type SectionProps = {
  mode: 'signin' | 'signup';
  // A newcomer: Google said who they are, the shop still needs a phone.
  onNeedsPhone: (pending: PendingGoogleSignUp) => void;
};

// "or" and Google's button, under the password form on both login and
// register. Either page can end in either outcome — an existing account is
// signed in, a new one goes to the phone step — so the two pages differ only
// in the button's wording.
export function GoogleAuthSection({ mode, onNeedsPhone }: SectionProps) {
  const { t } = useTranslation('auth');
  const finishSignIn = useFinishSignIn();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isGoogleAuthEnabled) return null;

  const handleAccessToken = async (accessToken: string) => {
    if (busy) return;
    setError(null);

    try {
      setBusy(true);
      const result = await authService.google({ accessToken });

      if ('needsPhone' in result) {
        onNeedsPhone({ accessToken, profile: result.profile });
        return;
      }

      await finishSignIn(result);
    } catch (err) {
      setError(apiErrorMessage(err, t('google.error')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.googleSection}>
      <p className={styles.divider}>
        <span>{t('google.or')}</span>
      </p>

      <GoogleButton
        mode={mode}
        onAccessToken={handleAccessToken}
        disabled={busy}
      />

      {busy && <p className={styles.googleStatus}>{t('google.wait')}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

type CompleteProps = {
  pending: PendingGoogleSignUp;
  onCancel: () => void;
};

// The second half of a first Google sign-up. Google vouched for the name and
// address; the phone is ours to ask for, because every order is delivered and
// confirmed by phone. The consent box is the same one registration has — this
// is registration, only with Google filling in most of it.
export function GoogleCompleteForm({ pending, onCancel }: CompleteProps) {
  const { t } = useTranslation('auth');
  const finishSignIn = useFinishSignIn();

  const [firstName, setFirstName] = useState(pending.profile.firstName ?? '');
  const [lastName, setLastName] = useState(pending.profile.lastName ?? '');
  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const result = await authService.google({
        accessToken: pending.accessToken,
        phone,
        firstName,
        lastName,
      });

      // Can only happen if the phone was dropped on the way; the server would
      // have refused an invalid one with a 400 instead.
      if ('needsPhone' in result) {
        setError(t('google.completeError'));
        return;
      }

      await finishSignIn(result);
    } catch (err) {
      setError(apiErrorMessage(err, t('google.completeError')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.panel}>
      <p className={styles.eyebrow}>{t('google.eyebrow')}</p>
      <h1 className={styles.title}>{t('google.title')}</h1>
      <p className={styles.lead}>
        {t('google.lead', { email: pending.profile.email })}
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>{t('register.firstName')}</span>
          <input
            required
            maxLength={100}
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('register.lastName')}</span>
          <input
            required
            maxLength={100}
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('register.phone')}</span>
          <input
            type="tel"
            required
            autoFocus
            autoComplete="tel"
            placeholder="+380"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.consent}>
          <input
            type="checkbox"
            required
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className={styles.consentBox}
          />
          <span>
            {t('register.termsBefore')}{' '}
            <Link
              to="/privacy"
              target="_blank"
              rel="noopener"
              className={styles.consentLink}
            >
              {t('register.termsLink')}
            </Link>{' '}
            {t('register.termsAfter')}
          </span>
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" disabled={loading} className={styles.submit}>
          {loading ? t('register.wait') : t('google.completeSubmit')}
        </button>
      </form>

      <p className={styles.switch}>
        <button type="button" onClick={onCancel} className={styles.switchButton}>
          {t('google.cancel')}
        </button>
      </p>
    </div>
  );
}
