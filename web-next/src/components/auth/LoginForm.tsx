import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from '../ui/LocalizedLink';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { authService } from '../../api/auth.api';
import { supportService } from '../../api/support.api';
import { ordersService } from '../../api/orders.api';
import { useMergeGuestCartMutation } from '../../hooks/mutations/useCartMutations';
import { useAppDispatch } from '../../store/hooks';
import { setAuth } from '../../store/slices/authSlice';
import { peekGuestToken } from '../../utils/guestToken';
import styles from './AuthPanel.module.scss';
import { apiErrorMessage } from '../../utils/apiError';

export default function LoginForm() {
  const { t } = useTranslation('auth');
  const navigate = useLocalizedNavigate();
  const dispatch = useAppDispatch();
  const mergeGuestCart = useMergeGuestCartMutation();

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
      dispatch(setAuth(auth));

      // Whatever this browser did as a guest — a cart, a support thread, past
      // orders — follows them into the account. Orders are claimed before the
      // cart merge, which clears the guest token on success.
      const guestToken = peekGuestToken();
      if (guestToken) {
        await ordersService.claimGuestOrders(guestToken).catch(() => {});
        await mergeGuestCart.mutateAsync(guestToken).catch(() => {});
        await supportService.claimGuestChat(guestToken).catch(() => {});
      }

      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err, t('login.error')));
    } finally {
      setLoading(false);
    }
  };

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
