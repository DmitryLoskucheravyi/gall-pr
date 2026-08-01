import { useState } from 'react';

import type { Material, Technique } from '../../types/dictionaries.types';
import { useMaterials } from '../../hooks/queries/useMaterials';
import { useTechniques } from '../../hooks/queries/useTechniques';
import {
  useMaterialMutations,
  useTechniqueMutations,
} from '../../hooks/mutations/useDictionaryMutations';
import Skeleton from '../../components/ui/Skeleton';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import styles from './DictionariesPage.module.scss';

type Tab = 'materials' | 'techniques';
type Item = Material | Technique;

export default function DictionariesPage() {
  const [tab, setTab] = useState<Tab>('materials');
  const [name, setName] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const { data: materials = [], isLoading: materialsLoading } = useMaterials();
  const { data: techniques = [], isLoading: techniquesLoading } = useTechniques();
  const materialMutations = useMaterialMutations();
  const techniqueMutations = useTechniqueMutations();
  const confirm = useConfirm();

  const items = tab === 'materials' ? materials : techniques;
  const loading = tab === 'materials' ? materialsLoading : techniquesLoading;
  const mutations = tab === 'materials' ? materialMutations : techniqueMutations;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    const onSuccess = () => {
      setName('');
      setEditingItem(null);
    };

    if (editingItem) {
      mutations.update.mutate({ id: editingItem.id, name: name.trim() }, { onSuccess });
    } else {
      mutations.create.mutate(name.trim(), { onSuccess });
    }
  };

  const handleDelete = async (item: Item) => {
    const ok = await confirm({
      title: 'Видалити запис?',
      message: `«${item.name}» буде видалено.`,
      confirmLabel: 'Видалити',
      danger: true,
    });
    if (!ok) return;
    mutations.remove.mutate(item.id);
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
        <div className={styles.list}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={styles.item}>
              <Skeleton className={styles.skeletonName} />
              <Skeleton className={styles.skeletonActions} />
            </div>
          ))}
        </div>
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
