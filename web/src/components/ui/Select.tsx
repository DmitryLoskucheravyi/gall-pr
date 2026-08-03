import { useEffect, useRef, useState } from 'react';

import styles from './Select.module.scss';

export type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  // For the cases where the visible label lives outside the control — a row
  // of identical pickers, say, where only their position tells them apart.
  ariaLabel?: string;
};

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Оберіть…',
  className,
  disabled = false,
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Nothing to close if it can't be opened; also drops the listeners the
  // moment the control is disabled while open.
  useEffect(() => {
    if (!open) return;

    const handleOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={rootRef} className={`${styles.wrap} ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={styles.trigger}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={selected ? styles.value : styles.placeholder}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${styles.chevron} ${open ? styles.open : ''}`}
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && !disabled && (
        <ul className={styles.menu} role="listbox">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`${styles.option} ${
                  option.value === value ? styles.selected : ''
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
