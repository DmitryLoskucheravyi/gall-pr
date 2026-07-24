import { useEffect, useState } from 'react';

import { materialsService } from '../../api/materials.api';
import { techniquesService } from '../../api/techniques.api';
import type { Material, Technique } from '../../types/dictionaries.types';
import { useAppDispatch } from '../../store/hooks';
import { showToast } from '../../store/slices/toastSlice';
import styles from './DictionariesPage.module.scss';

type Tab = 'materials' | 'techniques';
type Item = Material | Technique;

export default function DictionariesPage() {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<Tab>('materials');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data =
        tab === 'materials'
          ? await materialsService.getMaterials()
          : await techniquesService.getTechniques();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingItem) {
        if (tab === 'materials') {
          await materialsService.updateMaterial(editingItem.id, name.trim());
        } else {
          await techniquesService.updateTechnique(editingItem.id, name.trim());
        }
      } else {
        if (tab === 'materials') {
          await materialsService.createMaterial(name.trim());
        } else {
          await techniquesService.createTechnique(name.trim());
        }
      }

      setName('');
      setEditingItem(null);
      loadItems();
      dispatch(showToast({ message: 'Збережено' }));
    } catch (error: any) {
      dispatch(
        showToast({
          message: error?.response?.data?.message ?? 'Не вдалося зберегти',
          variant: 'error',
        }),
      );
    }
  };

  const handleDelete = async (item: Item) => {
    if (!window.confirm(`Видалити "${item.name}"?`)) return;

    try {
      if (tab === 'materials') {
        await materialsService.deleteMaterial(item.id);
      } else {
        await techniquesService.deleteTechnique(item.id);
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      dispatch(showToast({ message: 'Видалено' }));
    } catch (error: any) {
      dispatch(
        showToast({
          message: error?.response?.data?.message ?? 'Не вдалося видалити',
          variant: 'error',
        }),
      );
    }
  };

  return (
    <div>
      <h1 className={styles.title}>Матеріали і техніки</h1>

      <div className={styles.tabs}>
        <button
          onClick={() => {
            setTab('materials');
            setEditingItem(null);
            setName('');
          }}
          className={tab === 'materials' ? styles.chipActive : styles.chip}
        >
          Матеріали
        </button>
        <button
          onClick={() => {
            setTab('techniques');
            setEditingItem(null);
            setName('');
          }}
          className={tab === 'techniques' ? styles.chipActive : styles.chip}
        >
          Техніки
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          placeholder="Назва"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
        />
        <button type="submit" className={styles.submitButton}>
          {editingItem ? 'Зберегти' : 'Додати'}
        </button>
        {editingItem && (
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setName('');
            }}
            className={styles.cancelButton}
          >
            Скасувати
          </button>
        )}
      </form>

      {loading ? (
        <p className={styles.muted}>Завантаження…</p>
      ) : items.length === 0 ? (
        <p className={styles.muted}>Записів поки немає</p>
      ) : (
        <div className={styles.list}>
          {items.map((item) => (
            <div key={item.id} className={styles.item}>
              <span className={styles.itemName}>{item.name}</span>
              <div className={styles.itemActions}>
                <button
                  onClick={() => {
                    setEditingItem(item);
                    setName(item.name);
                  }}
                  className={styles.editButton}
                >
                  Редагувати
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className={styles.deleteButton}
                >
                  Видалити
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
