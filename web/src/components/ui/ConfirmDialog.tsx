import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useEscapeKey } from '../../hooks/useEscapeKey';
import styles from './ConfirmDialog.module.scss';

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const open = options !== null;

  useEscapeKey(() => close(false), open);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div className={styles.overlay} onClick={() => close(false)}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className={styles.title}>{options.title}</h2>
            {options.message && (
              <p className={styles.message}>{options.message}</p>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => close(false)}
                className={styles.cancel}
              >
                {options.cancelLabel ?? 'Скасувати'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={options.danger ? styles.confirmDanger : styles.confirm}
                autoFocus
              >
                {options.confirmLabel ?? 'Підтвердити'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
