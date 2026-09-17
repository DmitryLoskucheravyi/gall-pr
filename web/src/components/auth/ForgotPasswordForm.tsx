import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from '../ui/LocalizedLink';
import { authService } from '../../api/auth.api';
import { apiErrorMessage } from '../../utils/apiError';
import styles from './AuthPanel.module.scss';

// Forgetting a password used to mean losing the account outright — there was
// no reset anywhere in the app or the API.
//
// The acknowledgement below is shown for every address, existing or not. That
// is the server's behaviour and this must not undo it: saying "no such user"
// here would turn the form into a way to test which addresses shop here.
export default function ForgotPasswordForm() {
  const { t } = useTranslation('auth');

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      setLoading(true);
      await authService.forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err, t('forgot.error')));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.panel}>
        <p className={styles.eyebrow}>{t('forgot.eyebrow')}</p>
        <h1 className={styles.title}>{t('forgot.sentTitle')}</h1>
        <p className={styles.lead}>{t('forgot.sentText')}</p>

        <p className={styles.switch}>
          <Link to="/login" className={styles.switchLink}>
            {t('forgot.backToLogin')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <p className={styles.eyebrow}>{t('forgot.eyebrow')}</p>
      <h1 className={styles.title}>{t('forgot.title')}</h1>
      <p className={styles.lead}>{t('forgot.lead')}</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>{t('forgot.email')}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" disabled={loading} className={styles.submit}>
          {loading ? t('forgot.wait') : t('forgot.submit')}
        </button>
      </form>

      <p className={styles.switch}>
        <Link to="/login" className={styles.switchLink}>
          {t('forgot.backToLogin')}
        </Link>
      </p>
    </div>
  );
}
