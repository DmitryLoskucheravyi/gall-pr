import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PaintingSort } from '../lib/queryKeys';
import styles from './CatalogFilters.module.scss';

type Range = { min: number; max: number };

// Ordered as the panel reads them, newest first — the catalogue's own default.
const SORTS: PaintingSort[] = [
  'newest',
  'oldest',
  'priceAsc',
  'priceDesc',
  'popular',
];

// Technique and material were offered here as chip rows and have been taken
// out: the dictionaries behind them are the artist's own working vocabulary,
// not a distinction a buyer shops by. Both remain on the painting itself and
// still drive "related works" — they simply aren't a way to narrow the
// catalogue any more. The API still accepts techniqueId/materialId, so
// bringing either back is a UI change alone.
type Props = {
  sort: PaintingSort;
  onSelectSort: (sort: PaintingSort) => void;
  priceBounds: Range;
  priceValue: Range;
  onApplyPrice: (value: Range) => void;
};

function clamp(value: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, value));
}

export default function CatalogFilters({
  sort,
  onSelectSort,
  priceBounds,
  priceValue,
  onApplyPrice,
}: Props) {
  const { t } = useTranslation('catalog');
  const [open, setOpen] = useState(false);
  const [draftMin, setDraftMin] = useState(priceValue.min);
  const [draftMax, setDraftMax] = useState(priceValue.max);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftMin(priceValue.min);
    setDraftMax(priceValue.max);
  }, [priceValue]);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  const isPriceActive =
    priceValue.min !== priceBounds.min || priceValue.max !== priceBounds.max;
  const isActive = sort !== 'newest' || isPriceActive;

  const span = priceBounds.max - priceBounds.min || 1;
  const minPercent = ((draftMin - priceBounds.min) / span) * 100;
  const maxPercent = ((draftMax - priceBounds.min) / span) * 100;

  const handleApply = () => {
    onApplyPrice({ min: draftMin, max: draftMax });
    setOpen(false);
  };

  const handleReset = () => {
    onSelectSort('newest');
    setDraftMin(priceBounds.min);
    setDraftMax(priceBounds.max);
    onApplyPrice(priceBounds);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={styles.wrap}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`${styles.trigger} ${isActive ? styles.triggerActive : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16M8 12h8M11 17h2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {t('filters.trigger')}
        {isActive && <span className={styles.dot} />}
      </button>

      {open && (
        <div className={styles.panel}>
          <p className={styles.panelTitle}>{t('filters.sort')}</p>
          <div className={styles.chips}>
            {SORTS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onSelectSort(option)}
                className={
                  sort === option
                    ? styles.chipActive
                    : styles.chip
                }
              >
                {t(`filters.sorts.${option}`)}
              </button>
            ))}
          </div>

          <p className={styles.panelTitle}>{t('filters.priceLabel')}</p>

          <div className={styles.inputsRow}>
            <input
              type="number"
              min={priceBounds.min}
              max={draftMax}
              value={draftMin}
              onChange={(e) =>
                setDraftMin(
                  clamp(Number(e.target.value), priceBounds.min, draftMax),
                )
              }
              className={styles.numberInput}
            />
            <span className={styles.dash}>—</span>
            <input
              type="number"
              min={draftMin}
              max={priceBounds.max}
              value={draftMax}
              onChange={(e) =>
                setDraftMax(
                  clamp(Number(e.target.value), draftMin, priceBounds.max),
                )
              }
              className={styles.numberInput}
            />
          </div>

          <div className={styles.sliderWrap}>
            <div className={styles.sliderTrack} />
            <div
              className={styles.sliderRange}
              style={{
                left: `${minPercent}%`,
                right: `${100 - maxPercent}%`,
              }}
            />
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              value={draftMin}
              onChange={(e) =>
                setDraftMin(Math.min(Number(e.target.value), draftMax))
              }
              className={styles.rangeInput}
            />
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              value={draftMax}
              onChange={(e) =>
                setDraftMax(Math.max(Number(e.target.value), draftMin))
              }
              className={`${styles.rangeInput} ${styles.rangeInputTop}`}
            />
          </div>

          <div className={styles.panelActions}>
            <button
              type="button"
              onClick={handleReset}
              className={styles.resetButton}
            >
              {t('filters.reset')}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className={styles.applyButton}
            >
              {t('filters.apply')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
