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

export default function LoginForm() {
  const { t } = useTranslation('auth');
  const finishSignIn = useFinishSignIn();
  const [pendingGoogle, setPendingGoogle] =
    useState<PendingGoogleSignUp | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const auth = await authService.login({ email, password });
      await finishSignIn(auth);
    } catch (err) {
      setError(apiErrorMessage(err, t('login.error')));
    } finally {
      setLoading(false);
    }
  };

  // A first-time visitor who pressed Google here rather than on /register
  // still gets an account — it just needs a phone number first.
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
      <p className={styles.eyebrow}>{t('login.eyebrow')}</p>
      <h1 className={styles.title}>{t('login.title')}</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>{t('login.email')}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('login.password')}</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" disabled={loading} className={styles.submit}>
          {loading ? t('login.wait') : t('login.submit')}
        </button>
      </form>

      <GoogleAuthSection mode="signin" onNeedsPhone={setPendingGoogle} />

      <p className={styles.switch}>
        <Link to="/forgot-password" className={styles.switchLink}>
          {t('login.forgotLink')}
        </Link>
      </p>

      <p className={styles.switch}>
        {t('login.switchText')}{' '}
        <Link to="/register" className={styles.switchLink}>
          {t('login.switchLink')}
        </Link>
      </p>
    </div>
  );
}
