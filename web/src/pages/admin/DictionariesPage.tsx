import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Material, Technique } from '../../types/dictionaries.types';
import { useMaterials } from '../../hooks/queries/useMaterials';
import { useTechniques } from '../../hooks/queries/useTechniques';
import {
  useMaterialMutations,
  useTechniqueMutations,
} from '../../hooks/mutations/useDictionaryMutations';
import Skeleton from '../../components/ui/Skeleton';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useLocale } from '../../hooks/useLocale';
import { pickLocale } from '../../utils/localizedField';
import styles from './DictionariesPage.module.scss';

type Tab = 'materials' | 'techniques';
type Item = Material | Technique;

export default function DictionariesPage() {
  const { t } = useTranslation('admin');
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>('materials');
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
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
      setNameEn('');
      setEditingItem(null);
    };
    const input = { name: name.trim(), nameEn: nameEn.trim() || undefined };

    if (editingItem) {
      mutations.update.mutate({ id: editingItem.id, ...input }, { onSuccess });
    } else {
      mutations.create.mutate(input, { onSuccess });
    }
  };

  const handleDelete = async (item: Item) => {
    const ok = await confirm({
      title: t('dictionaries.confirmDelete.title'),
      message: t('dictionaries.confirmDelete.message', {
        name: pickLocale(item, 'name', locale),
      }),
      confirmLabel: t('dictionaries.confirmDelete.confirmLabel'),
      danger: true,
    });
    if (!ok) return;
    mutations.remove.mutate(item.id);
  };

  return (
    <div>
      <h1 className={styles.title}>{t('dictionaries.title')}</h1>

      <div className={styles.tabs}>
        <button
          onClick={() => {
            setTab('materials');
            setEditingItem(null);
            setName('');
          }}
          className={tab === 'materials' ? styles.chipActive : styles.chip}
        >
          {t('dictionaries.materials')}
        </button>
        <button
          onClick={() => {
            setTab('techniques');
            setEditingItem(null);
            setName('');
          }}
          className={tab === 'techniques' ? styles.chipActive : styles.chip}
        >
          {t('dictionaries.techniques')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          placeholder={t('dictionaries.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
        />
        <input
          placeholder={t('dictionaries.nameEnPlaceholder')}
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className={styles.input}
        />
        <button type="submit" className={styles.submitButton}>
          {editingItem ? t('dictionaries.save') : t('dictionaries.add')}
        </button>
        {editingItem && (
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setName('');
              setNameEn('');
            }}
            className={styles.cancelButton}
          >
            {t('dictionaries.cancel')}
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
        <p className={styles.muted}>{t('dictionaries.empty')}</p>
      ) : (
        <div className={styles.list}>
          {items.map((item) => (
            <div key={item.id} className={styles.item}>
              <span className={styles.itemName}>
                {pickLocale(item, 'name', locale)}
              </span>
              <div className={styles.itemActions}>
                <button
                  onClick={() => {
                    setEditingItem(item);
                    setName(item.name);
                    setNameEn(item.nameEn ?? '');
                  }}
                  className={styles.editButton}
                >
                  {t('dictionaries.edit')}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className={styles.deleteButton}
                >
                  {t('dictionaries.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
