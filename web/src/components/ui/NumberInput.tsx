import type { InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './NumberInput.module.scss';

// A number field without the browser's spinner: the native arrows look like a
// different operating system dropped into the page, and differ in every
// browser. The field itself stays a real <input type="number"> — so it keeps
// validation (min, max, step, required), the numeric keyboard on a phone and
// the arrow keys — and its two steps are hairline − and + of our own.
//
// The caller's className styles the field exactly as before (each form has
// its own .input); this only adds room on the right for the steppers.

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'min' | 'max' | 'step'
> & {
  value: string | number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  /** How far − / + move, when that should differ from the validity step —
   * a price typed to the hryvnia but nudged by the hundred. */
  nudge?: number;
  /** No − / + of its own — for narrow fields that have another control
   * beside them (the price slider in the catalogue filters). */
  bare?: boolean;
};

// Enough decimals to show the step exactly, so 0.1 + 0.2 lands on 0.3.
function decimalsOf(n: number): number {
  const text = String(n);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

export default function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  nudge,
  bare = false,
  className,
  disabled,
  ...rest
}: Props) {
  const { t } = useTranslation('common');
  const current = value === '' ? NaN : Number(value);

  const stepBy = (direction: 1 | -1) => {
    // An empty field starts from its floor (or zero), not a step away from it.
    const by = nudge ?? step;
    let next = Number.isFinite(current) ? current + direction * by : (min ?? 0);
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(String(Number(next.toFixed(decimalsOf(by)))));
  };

  const atMin = min !== undefined && Number.isFinite(current) && current <= min;
  const atMax = max !== undefined && Number.isFinite(current) && current >= max;

  return (
    <div className={styles.wrap}>
      <input
        {...rest}
        type="number"
        inputMode={
          rest.inputMode ?? (decimalsOf(step) > 0 ? 'decimal' : 'numeric')
        }
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${className ?? ''} ${styles.input}`}
        data-bare={bare || undefined}
      />

      {bare ? null : (
        <span className={styles.steps}>
          <button
            type="button"
            className={styles.step}
            onClick={() => stepBy(-1)}
            disabled={disabled || atMin}
            aria-label={t('number.decrease')}
            tabIndex={-1}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 8.2c3-.3 6-.3 9 0" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.step}
            onClick={() => stepBy(1)}
            disabled={disabled || atMax}
            aria-label={t('number.increase')}
            tabIndex={-1}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 8.2c3-.3 6-.3 9 0" />
              <path d="M8 3.6c.3 3 .3 6 0 9" />
            </svg>
          </button>
        </span>
      )}
    </div>
  );
}
