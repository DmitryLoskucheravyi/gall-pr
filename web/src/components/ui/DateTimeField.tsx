'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocale } from '../../hooks/useLocale';
import NumberInput from './NumberInput';
import styles from './DateTimeField.module.scss';

// A date-and-time field with our own calendar instead of the browser's.
//
// The native datetime-local picker is a different widget in every browser
// and nothing like the rest of the site. This one opens the same kind of
// panel as ui/Select: a month grid (Monday first), the hour and minute below
// it, and the value it hands back is exactly the string datetime-local would
// have — "YYYY-MM-DDTHH:mm", local time, or "" — so a form switching to it
// changes nothing else.

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
};

type Parts = { y: number; m: number; d: number; hh: number; mm: number };

const pad = (n: number) => String(n).padStart(2, '0');

function parse(value: string): Parts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, m, d, hh, mm] = match.map(Number);
  return { y, m: m - 1, d, hh, mm };
}

function format(p: Parts): string {
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}T${pad(p.hh)}:${pad(p.mm)}`;
}

export default function DateTimeField({
  value,
  onChange,
  required,
  placeholder,
  className,
  ariaLabel,
}: Props) {
  const { t } = useTranslation('common');
  const locale = useLocale();
  const tag = locale === 'en' ? 'en-GB' : 'uk-UA';
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected = parse(value);
  const now = new Date();
  // The month on show: the chosen one, or this one when nothing is chosen.
  const [view, setView] = useState(() => ({
    y: selected?.y ?? now.getFullYear(),
    m: selected?.m ?? now.getMonth(),
  }));

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const monthTitle = new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }).format(
    new Date(view.y, view.m, 1),
  );

  const weekdays = useMemo(() => {
    const f = new Intl.DateTimeFormat(tag, { weekday: 'short' });
    // 2024-01-01 was a Monday.
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(2024, 0, 1 + i)));
  }, [tag]);

  // Six rows of seven, starting on the Monday on or before the 1st.
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const lead = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => new Date(view.y, view.m, 1 - lead + i));
  }, [view]);

  const shift = (by: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + by, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const pickDay = (date: Date) => {
    onChange(
      format({
        y: date.getFullYear(),
        m: date.getMonth(),
        d: date.getDate(),
        // A day picked before any time keeps the hour sensible: noon.
        hh: selected?.hh ?? 12,
        mm: selected?.mm ?? 0,
      }),
    );
    if (date.getMonth() !== view.m) setView({ y: date.getFullYear(), m: date.getMonth() });
  };

  const setTime = (field: 'hh' | 'mm', raw: string) => {
    const base = selected ?? { y: view.y, m: view.m, d: now.getDate(), hh: 12, mm: 0 };
    const limit = field === 'hh' ? 23 : 59;
    const n = Math.min(limit, Math.max(0, Math.round(Number(raw) || 0)));
    onChange(format({ ...base, [field]: n }));
  };

  const label = selected
    ? new Intl.DateTimeFormat(tag, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(selected.y, selected.m, selected.d, selected.hh, selected.mm))
    : null;

  const isSame = (a: Date, p: Parts | null) =>
    !!p && a.getFullYear() === p.y && a.getMonth() === p.m && a.getDate() === p.d;
  const isToday = (a: Date) =>
    a.getFullYear() === now.getFullYear() && a.getMonth() === now.getMonth() && a.getDate() === now.getDate();

  return (
    <div ref={rootRef} className={`${styles.wrap} ${className ?? ''}`}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={label ? styles.value : styles.placeholder}>
          {label ?? placeholder ?? t('dateTime.placeholder')}
        </span>
        <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
          <path d="M4.5 7.2c0-1.2.9-2 2-2h11c1.1 0 2 .8 2 2v10.6c0 1.2-.9 2-2 2h-11c-1.1 0-2-.8-2-2z" />
          <path d="M4.6 9.6c4.9-.3 9.9-.3 14.8 0M8.4 3.6v3M15.6 3.6v3" />
          <path d="M12 12.4v2.9l1.9 1.1" />
        </svg>
      </button>

      {/* Keeps the browser's own "please fill in" check for a required
          field: an invisible input that carries the value. */}
      {required ? (
        <input
          className={styles.proxy}
          value={value}
          required
          onChange={() => {}}
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : null}

      {open ? (
        <div className={styles.panel} role="dialog" aria-label={ariaLabel ?? t('dateTime.placeholder')}>
          <div className={styles.head}>
            <button type="button" className={styles.nav} onClick={() => shift(-1)} aria-label={t('dateTime.prevMonth')}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M10 3.5 5.6 8l4.4 4.5" />
              </svg>
            </button>
            <span className={styles.month}>{monthTitle}</span>
            <button type="button" className={styles.nav} onClick={() => shift(1)} aria-label={t('dateTime.nextMonth')}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M6 3.5 10.4 8 6 12.5" />
              </svg>
            </button>
          </div>

          <div className={styles.grid}>
            {weekdays.map((w) => (
              <span key={w} className={styles.weekday}>
                {w}
              </span>
            ))}
            {cells.map((date) => (
              <button
                key={date.toISOString()}
                type="button"
                className={styles.day}
                data-outside={date.getMonth() !== view.m || undefined}
                data-today={isToday(date) || undefined}
                data-selected={isSame(date, selected) || undefined}
                aria-pressed={isSame(date, selected)}
                onClick={() => pickDay(date)}
              >
                {date.getDate()}
              </button>
            ))}
          </div>

          <div className={styles.time}>
            <span className={styles.timeLabel}>{t('dateTime.time')}</span>
            <NumberInput
              className={styles.timeInput}
              value={selected ? pad(selected.hh) : ''}
              onChange={(v) => setTime('hh', v)}
              min={0}
              max={23}
              aria-label={t('dateTime.hours')}
            />
            <span className={styles.colon}>:</span>
            <NumberInput
              className={styles.timeInput}
              value={selected ? pad(selected.mm) : ''}
              onChange={(v) => setTime('mm', v)}
              min={0}
              max={59}
              step={5}
              aria-label={t('dateTime.minutes')}
            />
          </div>

          <div className={styles.foot}>
            <button
              type="button"
              className={styles.link}
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              {t('dateTime.clear')}
            </button>
            <button type="button" className={styles.done} onClick={() => setOpen(false)}>
              {t('dateTime.done')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
