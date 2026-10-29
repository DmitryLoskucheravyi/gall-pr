import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from '../ui/LocalizedLink';
import { authService } from '../../api/auth.api';
import { useFinishSignIn } from '../../hooks/useFinishSignIn';
import {
  GoogleAuthSection,
  GoogleCompleteForm,
  type PendingGoogleSignUp,
} from './GoogleAuth';
import styles from './AuthPanel.module.scss';
import { apiErrorMessage } from '../../utils/apiError';

export default function RegisterForm() {
  const { t } = useTranslation('auth');
  const finishSignIn = useFinishSignIn();
  const [pendingGoogle, setPendingGoogle] =
    useState<PendingGoogleSignUp | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const auth = await authService.register({
        firstName,
        lastName,
        email,
        phone,
        password,
      });
      await finishSignIn(auth);
    } catch (err) {
      setError(apiErrorMessage(err, t('register.error')));
    } finally {
      setLoading(false);
    }
  };

  if (pendingGoogle) {
    return (
      <GoogleCompleteForm
        pending={pendingGoogle}
        onCancel={() => setPendingGoogle(null)}
      />
    );
  }

  return (
    <div className={styles.panel}>
      <p className={styles.eyebrow}>{t('register.eyebrow')}</p>
      <h1 className={styles.title}>{t('register.title')}</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>{t('register.firstName')}</span>
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('register.lastName')}</span>
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('register.email')}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('register.phone')}</span>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('register.password')}</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
          />
        </label>

        {/* Required, so the browser refuses to submit without it. The link
            opens in a new tab: following it here would throw away everything
            typed into the form above. */}
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
          {loading ? t('register.wait') : t('register.submit')}
        </button>
      </form>

      <GoogleAuthSection mode="signup" onNeedsPhone={setPendingGoogle} />

      <p className={styles.switch}>
        {t('register.switchText')}{' '}
        <Link to="/login" className={styles.switchLink}>
          {t('register.switchLink')}
        </Link>
      </p>
    </div>
  );
}
