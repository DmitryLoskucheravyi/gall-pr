import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { authService } from '../api/auth.api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setUser } from '../store/slices/authSlice';
import styles from './AuthForm.module.scss';

const RESEND_SECONDS = 60;

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Already verified or not logged in — nothing to do here.
  if (!user) return <Navigate to="/register" replace />;
  if (user.isVerified) return <Navigate to="/" replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      setLoading(true);
      const { user: updated } = await authService.verifyEmail(
        user.email,
        code.trim(),
      );
      dispatch(setUser(updated));
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не вдалося підтвердити код');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    try {
      await authService.resendCode(user.email);
      setNotice('Новий код надіслано на вашу пошту');
      setCooldown(RESEND_SECONDS);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не вдалося надіслати код');
    }
  };

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Підтвердження пошти</h1>

      <p className={styles.footer} style={{ marginTop: 8, marginBottom: 0 }}>
        Ми надіслали 6-значний код на <strong>{user.email}</strong>. Введіть його
        нижче.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className={styles.input}
          style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: 20 }}
        />

        {error && <p className={styles.error}>{error}</p>}
        {notice && (
          <p className={styles.footer} style={{ margin: 0, color: 'var(--color-success)' }}>
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className={styles.submitButton}
        >
          {loading ? 'Перевірка…' : 'Підтвердити'}
        </button>
      </form>

      <p className={styles.footer}>
        Не отримали код?{' '}
        {cooldown > 0 ? (
          <span style={{ color: 'var(--color-text-muted)' }}>
            Повторно за {cooldown} с
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className={styles.footerLink}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Надіслати знову
          </button>
        )}
      </p>
    </div>
  );
}
