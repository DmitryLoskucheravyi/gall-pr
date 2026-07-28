import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { authService } from '../api/auth.api';
import { useMergeGuestCartMutation } from '../hooks/mutations/useCartMutations';
import { useAppDispatch } from '../store/hooks';
import { setAuth } from '../store/slices/authSlice';
import { peekGuestToken } from '../utils/guestToken';
import styles from './AuthForm.module.scss';

export default function RegisterPage() {
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

      const guestToken = peekGuestToken();
      if (guestToken) {
        await mergeGuestCart.mutateAsync(guestToken).catch(() => {});
      }

      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не вдалося зареєструватись');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Реєстрація</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          required
          placeholder="Ім'я"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className={styles.input}
        />

        <input
          required
          placeholder="Прізвище"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className={styles.input}
        />

        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
        />

        <input
          required
          placeholder="Телефон"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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
          {loading ? 'Зачекайте…' : 'Зареєструватись'}
        </button>
      </form>

      <p className={styles.footer}>
        Вже є акаунт?{' '}
        <Link to="/login" className={styles.footerLink}>
          Увійти
        </Link>
      </p>
    </div>
  );
}
