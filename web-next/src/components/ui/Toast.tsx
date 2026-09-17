import { useEffect, useRef, useState } from 'react';

import { useAppSelector } from '../../store/hooks';
import styles from './Toast.module.scss';

const DURATION = 2600;

export default function Toast() {
  const message = useAppSelector((state) => state.toast.message);
  const variant = useAppSelector((state) => state.toast.variant);
  const token = useAppSelector((state) => state.toast.token);

  const [visibleMessage, setVisibleMessage] = useState<string | null>(null);
  const [visibleVariant, setVisibleVariant] = useState(variant);
  const [isShown, setIsShown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message || token === 0) return;

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    setVisibleMessage(message);
    setVisibleVariant(variant);
    // Let the DOM paint the hidden state first so the transition runs.
    requestAnimationFrame(() => setIsShown(true));

    timerRef.current = setTimeout(() => {
      setIsShown(false);
      hideTimerRef.current = setTimeout(() => setVisibleMessage(null), 300);
    }, DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!visibleMessage) return null;

  const toastClass = [
    styles.toast,
    isShown ? styles.shown : '',
    visibleVariant === 'error' ? styles.error : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.wrap} aria-live="polite">
      <div className={toastClass}>
        {visibleVariant === 'success' && (
          <span className={styles.check}>✓</span>
        )}
        <span>{visibleMessage}</span>
      </div>
    </div>
  );
}
