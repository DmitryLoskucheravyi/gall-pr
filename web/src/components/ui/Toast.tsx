import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

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
  // Bumped per toast so the timer line restarts even when the same message
  // fires twice in a row.
  const [run, setRun] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message || token === 0) return;

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    setVisibleMessage(message);
    setVisibleVariant(variant);
    setRun((n) => n + 1);
    // Let the DOM paint the hidden state first so the transition runs.
    requestAnimationFrame(() => setIsShown(true));

    timerRef.current = setTimeout(() => {
      setIsShown(false);
      hideTimerRef.current = setTimeout(() => setVisibleMessage(null), 400);
    }, DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!visibleMessage) return null;

  return (
    <div className={styles.wrap} aria-live="polite">
      <div
        className={styles.toast}
        data-shown={isShown}
        data-variant={visibleVariant}
        style={{ '--toast-ms': `${DURATION}ms` } as CSSProperties}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {visibleVariant === 'error' ? (
            <>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.3" />
              <path d="M12 7.5v5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12" cy="16.3" r="0.9" fill="currentColor" />
            </>
          ) : (
            <>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.3" />
              <path
                className={styles.tick}
                d="M8 12.3l2.7 2.7L16.2 9.4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
        </svg>
        <span className={styles.message}>{visibleMessage}</span>
        <span key={run} className={styles.timer} aria-hidden="true" />
      </div>
    </div>
  );
}
