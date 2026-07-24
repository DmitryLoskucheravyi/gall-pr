import { useEffect, useState } from 'react';

import { paintingsService } from '../api/paintings.api';
import { techniquesService } from '../api/techniques.api';
import type { Painting } from '../types/painting.types';
import type { Technique } from '../types/dictionaries.types';
import PaintingCard from '../components/PaintingCard';
import CreatePaintingForm from '../components/admin/CreatePaintingForm';
import { useAddToCart } from '../hooks/useAddToCart';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { showToast } from '../store/slices/toastSlice';
import styles from './CatalogPage.module.scss';

export default function CatalogPage() {
  const user = useAppSelector((state) => state.auth.user);
  const addToCart = useAddToCart();
  const dispatch = useAppDispatch();

  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<
    number | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPainting, setEditingPainting] = useState<Painting | null>(
    null,
  );

  useEffect(() => {
    techniquesService.getTechniques().then(setTechniques);
  }, []);

  useEffect(() => {
    loadPaintings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTechniqueId]);

  const loadPaintings = async () => {
    try {
      const response = await paintingsService.getPaintings(
        1,
        24,
        selectedTechniqueId ?? undefined,
      );
      setPaintings(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (painting: Painting) => {
    if (!window.confirm(`Видалити картину "${painting.title}"?`)) return;

    try {
      await paintingsService.deletePainting(painting.id);
      setPaintings((prev) => prev.filter((item) => item.id !== painting.id));
      dispatch(showToast({ message: 'Картину видалено' }));
    } catch (error: any) {
      dispatch(
        showToast({
          message:
            error?.response?.data?.message ?? 'Не вдалося видалити картину',
          variant: 'error',
        }),
      );
    }
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
        <button
          onClick={() => setSelectedTechniqueId(null)}
          className={
            selectedTechniqueId === null ? styles.chipActive : styles.chip
          }
        >
          Усі
        </button>

        {techniques.map((technique) => (
          <button
            key={technique.id}
            onClick={() => setSelectedTechniqueId(technique.id)}
            className={
              selectedTechniqueId === technique.id
                ? styles.chipActive
                : styles.chip
            }
          >
            {technique.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={styles.muted}>Завантаження…</p>
      ) : paintings.length === 0 ? (
        <p className={styles.muted}>Картин поки немає</p>
      ) : (
        <div className={styles.grid}>
          {paintings.map((painting) => (
            <PaintingCard
              key={painting.id}
              painting={painting}
              isAdmin={user?.role === 'ADMIN'}
              onBuy={() => addToCart(painting)}
              onEdit={() => setEditingPainting(painting)}
              onDelete={() => handleDelete(painting)}
            />
          ))}
        </div>
      )}

      {showCreateForm && (
        <CreatePaintingForm
          onSaved={() => {
            setShowCreateForm(false);
            loadPaintings();
          }}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {editingPainting && (
        <CreatePaintingForm
          painting={editingPainting}
          onSaved={() => {
            setEditingPainting(null);
            loadPaintings();
          }}
          onClose={() => setEditingPainting(null)}
        />
      )}
    </div>
  );
}
