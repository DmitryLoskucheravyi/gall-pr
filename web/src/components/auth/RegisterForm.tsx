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

export default function RegisterForm() {
  const navigate = useNavigate();
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
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не вдалося зареєструватись');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.panel}>
      <p className={styles.eyebrow}>Новий гість</p>
      <h1 className={styles.title}>Реєстрація</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Ім'я</span>
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Прізвище</span>
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={styles.input}
          />
        </label>

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
          <span className={styles.label}>Телефон</span>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
          {loading ? 'Зачекайте…' : 'Зареєструватись'}
        </button>
      </form>

      <p className={styles.switch}>
        Вже є акаунт?{' '}
        <Link to="/login" className={styles.switchLink}>
          Увійти
        </Link>
      </p>
    </div>
  );
}
