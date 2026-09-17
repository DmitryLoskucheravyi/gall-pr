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

export default function RegisterForm() {
  const { t } = useTranslation('auth');
  const navigate = useLocalizedNavigate();
  const dispatch = useAppDispatch();
  const mergeGuestCart = useMergeGuestCartMutation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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
      dispatch(setAuth(auth));

      // Whatever this browser did as a guest — a cart, a support thread, past
      // orders — follows them into the new account. Orders are claimed before
      // the cart merge, which clears the guest token on success.
      const guestToken = peekGuestToken();
      if (guestToken) {
        await ordersService.claimGuestOrders(guestToken).catch(() => {});
        await mergeGuestCart.mutateAsync(guestToken).catch(() => {});
        await supportService.claimGuestChat(guestToken).catch(() => {});
      }

      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err, t('register.error')));
    } finally {
      setLoading(false);
    }
  };

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

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" disabled={loading} className={styles.submit}>
          {loading ? t('register.wait') : t('register.submit')}
        </button>
      </form>

      <p className={styles.switch}>
        {t('register.switchText')}{' '}
        <Link to="/login" className={styles.switchLink}>
          {t('register.switchLink')}
        </Link>
      </p>
    </div>
  );
}
