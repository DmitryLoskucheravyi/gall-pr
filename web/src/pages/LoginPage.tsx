import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { authService } from '../api/auth.api';
import { cartService } from '../api/cart.api';
import { useAppDispatch } from '../store/hooks';
import { setAuth } from '../store/slices/authSlice';
import { clearGuestToken, peekGuestToken } from '../utils/guestToken';
import styles from './AuthForm.module.scss';

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

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

      const guestToken = peekGuestToken();
      if (guestToken) {
        await cartService.mergeGuestCart(guestToken).catch(() => {});
        clearGuestToken();
      }

      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не вдалося увійти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Вхід</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
        />

        <input
          type="password"
          required
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
        />

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? 'Зачекайте…' : 'Увійти'}
        </button>
      </form>

      <p className={styles.footer}>
        Немає акаунту?{' '}
        <Link to="/register" className={styles.footerLink}>
          Зареєструватись
        </Link>
      </p>
    </div>
  );
}
