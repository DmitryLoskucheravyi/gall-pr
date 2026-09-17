import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAdminSeries } from '../../hooks/queries/useSeries';
import {
  useCreateSeriesMutation,
  useDeleteSeriesMutation,
  useUpdateSeriesMutation,
} from '../../hooks/mutations/useSeriesMutations';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import Checkbox from '../../components/ui/Checkbox';
import Skeleton from '../../components/ui/Skeleton';
import type { Series, SeriesInput } from '../../types/series.types';
import styles from './AdminSeriesPage.module.scss';

const EMPTY: SeriesInput = {
  name: '',
  nameEn: '',
  description: '',
  descriptionEn: '',
  coverImage: '',
  sortOrder: 0,
  isPublished: true,
};

// Full CRUD over series. The one screen that can create them from scratch —
// the painting page can only start one around the work you are looking at.
export default function AdminSeriesPage() {
  const { t } = useTranslation('admin');
  const confirm = useConfirm();

  const { data: series = [], isLoading } = useAdminSeries();
  const createSeries = useCreateSeriesMutation();
  const updateSeries = useUpdateSeriesMutation();
  const deleteSeries = useDeleteSeriesMutation();

  // null = the create form; a number = editing that row.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<SeriesInput>(EMPTY);

  const startCreate = () => {
    setEditingId(null);
    setDraft(EMPTY);
  };

  const startEdit = (entry: Series) => {
    setEditingId(entry.id);
    setDraft({
      name: entry.name,
      nameEn: entry.nameEn ?? '',
      description: entry.description ?? '',
      descriptionEn: entry.descriptionEn ?? '',
      coverImage: entry.coverImage ?? '',
      sortOrder: entry.sortOrder,
      isPublished: entry.isPublished,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const name = draft.name.trim();
    if (!name) return;

    // Empty strings are cleared rather than stored: "" and null both mean "no
    // English name", and keeping one of them out of the column keeps the
    // storefront's fallback logic simple.
    const input: SeriesInput = {
      name,
      nameEn: draft.nameEn?.trim() || undefined,
      description: draft.description?.trim() || undefined,
      descriptionEn: draft.descriptionEn?.trim() || undefined,
      coverImage: draft.coverImage?.trim() || undefined,
      sortOrder: Number(draft.sortOrder) || 0,
      isPublished: draft.isPublished,
    };

    if (editingId === null) {
      await createSeries.mutateAsync(input).catch(() => null);
      setDraft(EMPTY);
      return;
    }

    await updateSeries.mutateAsync({ id: editingId, input }).catch(() => null);
    setEditingId(null);
    setDraft(EMPTY);
  };

  const handleDelete = async (entry: Series) => {
    const ok = await confirm({
      title: t('seriesPage.confirmDelete.title', { name: entry.name }),
      message: t('seriesPage.confirmDelete.message', {
        count: entry.paintingsCount,
      }),
      confirmLabel: t('seriesPage.confirmDelete.confirmLabel'),
      danger: true,
    });
    if (!ok) return;

    await deleteSeries.mutateAsync(entry.id).catch(() => null);
    if (editingId === entry.id) startCreate();
  };

  const busy = createSeries.isPending || updateSeries.isPending;

  return (
    <div>
      <h1 className={styles.title}>{t('seriesPage.title')}</h1>
      <p className={styles.lead}>{t('seriesPage.lead')}</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.formTitle}>
          {editingId === null
            ? t('seriesPage.form.createTitle')
            : t('seriesPage.form.editTitle')}
        </h2>

        <div className={styles.row2}>
          <input
            required
            maxLength={255}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder={t('seriesPage.form.name')}
            className={styles.input}
          />
          <input
            maxLength={255}
            value={draft.nameEn ?? ''}
            onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
            placeholder={t('seriesPage.form.nameEn')}
            className={styles.input}
          />
        </div>

        <textarea
          rows={3}
          maxLength={5000}
          value={draft.description ?? ''}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder={t('seriesPage.form.description')}
          className={styles.textarea}
        />

        <textarea
          rows={3}
          maxLength={5000}
          value={draft.descriptionEn ?? ''}
          onChange={(e) =>
            setDraft({ ...draft, descriptionEn: e.target.value })
          }
          placeholder={t('seriesPage.form.descriptionEn')}
          className={styles.textarea}
        />

        <div className={styles.row2}>
          <input
            maxLength={500}
            value={draft.coverImage ?? ''}
            onChange={(e) => setDraft({ ...draft, coverImage: e.target.value })}
            placeholder={t('seriesPage.form.coverImage')}
            className={styles.input}
          />
          <input
            type="number"
            min={0}
            value={draft.sortOrder ?? 0}
            onChange={(e) =>
              setDraft({ ...draft, sortOrder: Number(e.target.value) })
            }
            placeholder={t('seriesPage.form.sortOrder')}
            className={styles.input}
          />
        </div>

        <Checkbox
          checked={draft.isPublished ?? true}
          onChange={(value) => setDraft({ ...draft, isPublished: value })}
        >
          {t('seriesPage.form.published')}
        </Checkbox>

        <div className={styles.formActions}>
          <button type="submit" disabled={busy} className={styles.submit}>
            {busy
              ? t('seriesPage.form.saving')
              : editingId === null
                ? t('seriesPage.form.create')
                : t('seriesPage.form.save')}
          </button>

          {editingId !== null && (
            <button
              type="button"
              onClick={startCreate}
              className={styles.cancel}
            >
              {t('seriesPage.form.cancel')}
            </button>
          )}
        </div>
      </form>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className={styles.rowSkeleton} />
          ))}
        </div>
      ) : series.length === 0 ? (
        <p className={styles.muted}>{t('seriesPage.empty')}</p>
      ) : (
        <div className={styles.list}>
          {series.map((entry) => (
            <div key={entry.id} className={styles.card}>
              <div className={styles.cardMain}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardName}>{entry.name}</h3>
                  {!entry.isPublished && (
                    <span className={styles.hiddenBadge}>
                      {t('seriesPage.hidden')}
                    </span>
                  )}
                </div>

                {entry.nameEn && (
                  <p className={styles.cardNameEn}>{entry.nameEn}</p>
                )}

                <p className={styles.cardMeta}>
                  {t('seriesPage.count', { count: entry.paintingsCount })} ·{' '}
                  {t('seriesPage.order', { order: entry.sortOrder })}
                </p>

                {entry.description && (
                  <p className={styles.cardDescription}>{entry.description}</p>
                )}
              </div>

              <div className={styles.cardActions}>
                <button
                  type="button"
                  onClick={() => startEdit(entry)}
                  className={styles.editButton}
                >
                  {t('seriesPage.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(entry)}
                  disabled={deleteSeries.isPending}
                  className={styles.deleteButton}
                >
                  {t('seriesPage.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
