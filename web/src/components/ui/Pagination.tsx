'use client';

import { useTranslation } from 'react-i18next';

import styles from './Pagination.module.scss';

type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

// The page numbers worth showing: always the first and last, the current
// one with a neighbour either side, and a gap marker wherever pages are
// skipped. A gap of exactly one page is shown as that page instead — "1 … 3"
// would hide a single number behind a symbol as wide as the number itself.
function pageItems(page: number, totalPages: number): (number | 'gap')[] {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const items: (number | 'gap')[] = [];
  for (const p of pages) {
    const prev = items[items.length - 1];
    if (typeof prev === 'number' && p - prev === 2) items.push(prev + 1);
    else if (typeof prev === 'number' && p - prev > 2) items.push('gap');
    items.push(p);
  }
  return items;
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const { t } = useTranslation('common');

  if (totalPages <= 1) return null;

  return (
    <nav className={styles.pagination} aria-label={t('pagination.aria')}>
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label={t('pagination.prev')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>

      <ul className={styles.pages}>
        {pageItems(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={item === page ? styles.pageActive : styles.page}
                onClick={() => onChange(item)}
                aria-label={t('pagination.page', { page: item })}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label={t('pagination.next')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </nav>
  );
}
