import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Select from '../ui/Select';
import { useSeries } from '../../hooks/queries/useSeries';
import {
  useAssignPaintingToSeriesMutation,
  useCreateSeriesMutation,
} from '../../hooks/mutations/useSeriesMutations';
import { useLocale } from '../../hooks/useLocale';
import { pickLocale } from '../../utils/localizedField';
import type { Painting } from '../../types/painting.types';
import styles from './PaintingSeriesControl.module.scss';

type Props = {
  painting: Painting;
};

// Admin-only, on the painting's own page: put this work into a series, take it
// out, or start a new series from it.
//
// The second of those is the point. Series are usually noticed one painting at
// a time — "this belongs with those" — and having to leave for the admin panel
// to write the name down is how the thought gets lost.
export default function PaintingSeriesControl({ painting }: Props) {
  const { t } = useTranslation('painting');
  const locale = useLocale();

  const { data: series = [] } = useSeries();
  const assign = useAssignPaintingToSeriesMutation();
  const createSeries = useCreateSeriesMutation();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const options = [
    { value: '', label: t('series.none') },
    ...series.map((entry) => ({
      value: String(entry.id),
      label: pickLocale(entry, 'name', locale),
    })),
  ];

  const handleSelect = (value: string) => {
    const seriesId = value ? Number(value) : null;
    if (seriesId === painting.seriesId) return;

    assign.mutate({ paintingId: painting.id, seriesId });
  };

  // Create and assign in one gesture: a series made from this screen is being
  // made *for* this painting, so leaving it empty afterwards would be the
  // wrong half of the job.
  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    const name = newName.trim();
    if (!name) return;

    const created = await createSeries.mutateAsync({ name }).catch(() => null);
    if (!created) return;

    await assign
      .mutateAsync({ paintingId: painting.id, seriesId: created.id })
      .catch(() => {});

    setNewName('');
    setCreating(false);
  };

  const busy = assign.isPending || createSeries.isPending;

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('series.title')}</h2>
        <span className={styles.adminBadge}>{t('series.adminOnly')}</span>
      </div>

      <div className={styles.row}>
        <Select
          value={painting.seriesId ? String(painting.seriesId) : ''}
          onChange={handleSelect}
          options={options}
          disabled={busy}
          ariaLabel={t('series.title')}
          className={styles.select}
        />

        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={busy}
            className={styles.newButton}
          >
            {t('series.create')}
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={handleCreate} className={styles.createForm}>
          <input
            autoFocus
            required
            maxLength={255}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('series.namePlaceholder')}
            className={styles.input}
          />
          <button type="submit" disabled={busy} className={styles.saveButton}>
            {createSeries.isPending ? t('series.saving') : t('series.save')}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setNewName('');
            }}
            className={styles.cancelButton}
          >
            {t('series.cancel')}
          </button>
        </form>
      )}

      <p className={styles.hint}>{t('series.hint')}</p>
    </section>
  );
}
