import { useEffect, useState } from 'react';

import type { Painting } from '../types/painting.types';
import { useTechniques } from '../hooks/queries/useTechniques';
import { usePriceRange } from '../hooks/queries/usePriceRange';
import { usePaintings } from '../hooks/queries/usePaintings';
import { useDeletePaintingMutation } from '../hooks/mutations/usePaintingMutations';
import { useLikedIds } from '../hooks/queries/useLikedIds';
import PaintingCard from '../components/PaintingCard';
import PaintingCardSkeleton from '../components/PaintingCardSkeleton';
import CreatePaintingForm from '../components/admin/CreatePaintingForm';
import CatalogFilters from '../components/CatalogFilters';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useAddToCart } from '../hooks/mutations/useAddToCart';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAppSelector } from '../store/hooks';
import styles from './CatalogPage.module.scss';

type PriceRange = { min: number; max: number };

export default function CatalogPage() {
  usePageMeta(
    'Каталог',
    'Каталог оригінальних картин українських художників — доступні для придбання роботи з доставкою Новою поштою.',
  );

  const user = useAppSelector((state) => state.auth.user);
  const addToCart = useAddToCart();

  const { data: likedIds = [] } = useLikedIds();
  const confirm = useConfirm();

  const [selectedTechniqueId, setSelectedTechniqueId] = useState<
    number | null
  >(null);
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPainting, setEditingPainting] = useState<Painting | null>(
    null,
  );
  const [priceFilter, setPriceFilter] = useState<PriceRange | null>(null);

  const { data: techniques = [] } = useTechniques();
  const { data: priceBounds = null } = usePriceRange();

  useEffect(() => {
    if (priceBounds && !priceFilter) setPriceFilter(priceBounds);
  }, [priceBounds, priceFilter]);

  const { data: paintingsResponse, isLoading: loading } = usePaintings({
    page: 1,
    limit: 24,
    techniqueId: selectedTechniqueId ?? undefined,
    isAvailable: true,
    minPrice: priceFilter?.min,
    maxPrice: priceFilter?.max,
  });

  const paintings = paintingsResponse?.data ?? [];
  const deletePainting = useDeletePaintingMutation();

  const visiblePaintings = showLikedOnly
    ? paintings.filter((painting) => likedIds.includes(painting.id))
    : paintings;

  const handleDelete = async (painting: Painting) => {
    const ok = await confirm({
      title: 'Видалити картину?',
      message: `«${painting.title}» буде видалено назавжди.`,
      confirmLabel: 'Видалити',
      danger: true,
    });
    if (!ok) return;
    deletePainting.mutate(painting);
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Каталог</h1>

        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setShowCreateForm(true)}
            className={styles.createButton}
          >
            + Створити картину
          </button>
        )}
      </div>

      <div className={styles.chips}>
        {user && (
          <button
            onClick={() => setShowLikedOnly((prev) => !prev)}
            aria-label="Показати лише вподобані"
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

        {priceBounds && (priceBounds.min > 0 || priceBounds.max > 0) && (
          <CatalogFilters
            techniques={techniques}
            selectedTechniqueId={selectedTechniqueId}
            onSelectTechnique={setSelectedTechniqueId}
            priceBounds={priceBounds}
            priceValue={priceFilter ?? priceBounds}
            onApplyPrice={setPriceFilter}
          />
        )}
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <PaintingCardSkeleton key={index} />
          ))}
        </div>
      ) : visiblePaintings.length === 0 ? (
        <p className={styles.muted}>
          {showLikedOnly
            ? 'Ви ще нічого не вподобали'
            : 'Картин поки немає'}
        </p>
      ) : (
        <div className={styles.grid}>
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
