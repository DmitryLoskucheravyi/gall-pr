import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { authService } from '../../api/auth.api';
import { supportService } from '../../api/support.api';
import { ordersService } from '../../api/orders.api';
import { useMergeGuestCartMutation } from '../../hooks/mutations/useCartMutations';
import { useAppDispatch } from '../../store/hooks';
import { setAuth } from '../../store/slices/authSlice';
import { peekGuestToken } from '../../utils/guestToken';
import styles from './AuthPanel.module.scss';

export default function LoginForm() {
  const navigate = useNavigate();
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
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не вдалося увійти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.panel}>
      <p className={styles.eyebrow}>Кабінет</p>
      <h1 className={styles.title}>Вхід</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Пароль</span>
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
          {loading ? 'Зачекайте…' : 'Увійти'}
        </button>
      </form>

      <p className={styles.switch}>
        Немає акаунту?{' '}
        <Link to="/register" className={styles.switchLink}>
          Зареєструватись
        </Link>
      </p>
    </div>
  );
}
