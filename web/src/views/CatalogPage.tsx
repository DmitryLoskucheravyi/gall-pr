'use client';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Painting } from '../types/painting.types';
import { useLocale } from '../hooks/useLocale';
import { pickLocale } from '../utils/localizedField';
import { usePriceRange } from '../hooks/queries/usePriceRange';
import { usePaintings } from '../hooks/queries/usePaintings';
import { useDeletePaintingMutation } from '../hooks/mutations/usePaintingMutations';
import { useLikedIds } from '../hooks/queries/useLikedIds';
import PaintingCard from '../components/PaintingCard';
import PaintingCardSkeleton from '../components/PaintingCardSkeleton';
import CreatePaintingForm from '../components/admin/CreatePaintingForm';
import CatalogFilters from '../components/CatalogFilters';
import SeriesShowcase from '../components/SeriesShowcase';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useAddToCart } from '../hooks/mutations/useAddToCart';
import { useAppSelector } from '../store/hooks';
import type { PaintingSort } from '../lib/queryKeys';
import GrowingBranches from '../components/ui/GrowingBranches';
import Pagination from '../components/ui/Pagination';
import Loader from '../components/ui/Loader';
import styles from './CatalogPage.module.scss';

type PriceRange = { min: number; max: number };

// Must match FIRST_PAGE.limit in app/[locale]/catalog/page.tsx, or the
// server-rendered first page is seeded under a key this view never asks for.
const PAGE_SIZE = 24;

export default function CatalogPage() {
  const { t } = useTranslation('catalog');
  const locale = useLocale();

  const user = useAppSelector((state) => state.auth.user);
  const addToCart = useAddToCart();

  const { data: likedIds = [] } = useLikedIds();
  const confirm = useConfirm();

  const [sort, setSort] = useState<PaintingSort>('newest');
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPainting, setEditingPainting] = useState<Painting | null>(
    null,
  );
  const [priceFilter, setPriceFilter] = useState<PriceRange | null>(null);
  // Two ways to read the catalogue: every work at once, or the same works
  // grouped under the series they belong to.
  const [view, setView] = useState<'all' | 'series'>('all');
  const [page, setPage] = useState(1);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data: priceBounds = null } = usePriceRange();

  // The full range is no filter at all, so it stays out of the query key.
  // Copying the bounds into the filter on arrival — as this page used to —
  // changed the key straight after hydration: the listing the server had
  // already rendered was thrown away, the grid fell back to skeletons, and
  // the same twenty-four paintings were fetched a second time.
  const narrowed =
    priceFilter &&
    !(
      priceBounds &&
      priceFilter.min === priceBounds.min &&
      priceFilter.max === priceBounds.max
    )
      ? priceFilter
      : null;

  const {
    data: paintingsResponse,
    isLoading: loading,
    isPlaceholderData: turningPage,
  } = usePaintings(
    {
      page,
      limit: PAGE_SIZE,
      isAvailable: true,
      minPrice: narrowed?.min,
      maxPrice: narrowed?.max,
      sort,
    },
    { keepPrevious: true },
  );

  const totalPages = paintingsResponse?.totalPages ?? 0;

  // Deleting the last work on the last page would otherwise leave the visitor
  // on a page that no longer exists, looking at "nothing here". Corrected
  // during render rather than in an effect, so the stale page never paints.
  if (totalPages > 0 && page > totalPages) setPage(totalPages);

  // A new sort or price range is a new list, so it starts from its first page.
  const changeSort = (next: PaintingSort) => {
    setSort(next);
    setPage(1);
  };

  const changePrice = (next: PriceRange) => {
    setPriceFilter(next);
    setPage(1);
  };

  const goToPage = (next: number) => {
    setPage(next);
    // Back to the top of the list: the pager sits under the grid, and the
    // next page should be read from its first row, not its last.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultsRef.current?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const paintings = paintingsResponse?.data ?? [];
  const deletePainting = useDeletePaintingMutation();

  const visiblePaintings = showLikedOnly
    ? paintings.filter((painting) => likedIds.includes(painting.id))
    : paintings;

  const handleDelete = async (painting: Painting) => {
    const ok = await confirm({
      title: t('confirmDelete.title'),
      message: t('confirmDelete.message', {
        title: pickLocale(painting, 'title', locale),
      }),
      confirmLabel: t('confirmDelete.confirmLabel'),
      danger: true,
    });
    if (!ok) return;
    deletePainting.mutate(painting);
  };

  return (
    <div>
      <GrowingBranches />
      <div className={styles.header}>
        <h1 className={styles.title}>{t('pageTitle')}</h1>

        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setShowCreateForm(true)}
            className={styles.createButton}
          >
            {t('createButton')}
          </button>
        )}
      </div>

      <div className={styles.chips}>
        {/* Opposite the filters: the two ways of reading the catalogue. The
            filters and the liked toggle belong to the flat list, so they step
            aside while the series view is open. */}
        <div className={styles.viewSwitch} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'all'}
            onClick={() => setView('all')}
            className={view === 'all' ? styles.viewOptionActive : styles.viewOption}
          >
            {t('view.all')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'series'}
            onClick={() => setView('series')}
            className={
              view === 'series' ? styles.viewOptionActive : styles.viewOption
            }
          >
            {t('view.series')}
          </button>
        </div>

        {view === 'all' && user && (
          <button
            onClick={() => setShowLikedOnly((prev) => !prev)}
            aria-label={t('likedOnlyAria')}
            className={
              showLikedOnly ? styles.likedButtonActive : styles.likedButton
            }
          >
            <svg viewBox="0 0 24 24" fill={showLikedOnly ? 'currentColor' : 'none'}>
              <path
                d="M12 20.25c-.19 0-.38-.05-.55-.16-.66-.42-1.62-1.04-2.67-1.83C5.02 15.6 2.25 12.7 2.25 9.15 2.25 6.3 4.53 4 7.35 4c1.85 0 3.47.98 4.65 2.53C13.18 4.98 14.8 4 16.65 4c2.82 0 5.1 2.3 5.1 5.15 0 3.55-2.77 6.45-6.53 9.11-1.05.79-2.01 1.41-2.67 1.83-.17.11-.36.16-.55.16Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}

        {view === 'all' &&
          priceBounds &&
          (priceBounds.min > 0 || priceBounds.max > 0) && (
          <CatalogFilters
            sort={sort}
            onSelectSort={changeSort}
            priceBounds={priceBounds}
            priceValue={priceFilter ?? priceBounds}
            onApplyPrice={changePrice}
          />
        )}
      </div>

      {view === 'series' ? (
        <SeriesShowcase
          isAdmin={user?.role === 'ADMIN'}
          onBuy={(painting) => addToCart.mutate(painting)}
          onEdit={setEditingPainting}
          onDelete={handleDelete}
        />
      ) : loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <PaintingCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        // While the next page or a new filter loads, the current grid stays
        // where it is, dimmed, with a spinner over it — rather than dropping
        // to skeletons and yanking the scroll position with it.
        <div
          ref={resultsRef}
          className={styles.results}
          aria-busy={turningPage}
        >
          {visiblePaintings.length === 0 ? (
            <p className={styles.muted}>
              {showLikedOnly ? t('emptyLiked') : t('emptyAll')}
            </p>
          ) : (
            <div className={turningPage ? styles.gridLoading : styles.grid}>
              {visiblePaintings.map((painting) => (
                <PaintingCard
                  key={painting.id}
                  painting={painting}
                  isAdmin={user?.role === 'ADMIN'}
                  onBuy={() => addToCart.mutate(painting)}
                  onEdit={() => setEditingPainting(painting)}
                  onDelete={() => handleDelete(painting)}
                />
              ))}
            </div>
          )}

          {turningPage && (
            <div className={styles.resultsLoader}>
              <Loader label={t('loading', { ns: 'common' })} />
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
        </div>
      )}

      {showCreateForm && (
        <CreatePaintingForm
          onSaved={() => setShowCreateForm(false)}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {editingPainting && (
        <CreatePaintingForm
          painting={editingPainting}
          onSaved={() => setEditingPainting(null)}
          onClose={() => setEditingPainting(null)}
        />
      )}
    </div>
  );
}
