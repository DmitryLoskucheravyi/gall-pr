import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Technique } from '../types/dictionaries.types';
import { useLocale } from '../hooks/useLocale';
import { pickLocale } from '../utils/localizedField';
import styles from './CatalogFilters.module.scss';

type Range = { min: number; max: number };

type Props = {
  techniques: Technique[];
  selectedTechniqueId: number | null;
  onSelectTechnique: (id: number | null) => void;
  priceBounds: Range;
  priceValue: Range;
  onApplyPrice: (value: Range) => void;
};

function clamp(value: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, value));
}

export default function CatalogFilters({
  techniques,
  selectedTechniqueId,
  onSelectTechnique,
  priceBounds,
  priceValue,
  onApplyPrice,
}: Props) {
  const { t } = useTranslation('catalog');
  const locale = useLocale();
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
  const isActive = selectedTechniqueId !== null || isPriceActive;

  const span = priceBounds.max - priceBounds.min || 1;
  const minPercent = ((draftMin - priceBounds.min) / span) * 100;
  const maxPercent = ((draftMax - priceBounds.min) / span) * 100;

  const handleApply = () => {
    onApplyPrice({ min: draftMin, max: draftMax });
    setOpen(false);
  };

  const handleReset = () => {
    onSelectTechnique(null);
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
          <p className={styles.panelTitle}>{t('filters.technique')}</p>
          <div className={styles.techniqueChips}>
            <button
              type="button"
              onClick={() => onSelectTechnique(null)}
              className={
                selectedTechniqueId === null
                  ? styles.techniqueChipActive
                  : styles.techniqueChip
              }
            >
              {t('filters.allTechniques')}
            </button>
            {techniques.map((technique) => (
              <button
                key={technique.id}
                type="button"
                onClick={() => onSelectTechnique(technique.id)}
                className={
                  selectedTechniqueId === technique.id
                    ? styles.techniqueChipActive
                    : styles.techniqueChip
                }
              >
                {pickLocale(technique, 'name', locale)}
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
