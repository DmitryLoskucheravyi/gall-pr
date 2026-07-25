import { useEffect, useState } from 'react';

import { giveawaysService } from '../../api/giveaways.api';
import { paintingsService } from '../../api/paintings.api';
import type { Giveaway } from '../../types/giveaway.types';
import type { Painting } from '../../types/painting.types';
import Select from '../../components/ui/Select';
import { useAppDispatch } from '../../store/hooks';
import { showToast } from '../../store/slices/toastSlice';
import styles from './AdminGiveawaysPage.module.scss';

function toDatetimeLocalValue(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminGiveawaysPage() {
  const dispatch = useAppDispatch();

  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState('');
  const [paintingId, setPaintingId] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    loadGiveaways();
    paintingsService.getPaintings(1, 200).then((response) => {
      setPaintings(response.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGiveaways = async () => {
    try {
      setLoading(true);
      const data = await giveawaysService.getGiveaways();
      setGiveaways(data);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setConditions('');
    setPaintingId('');
    setDeadline('');
  };

  const handleEdit = (giveaway: Giveaway) => {
    setEditingId(giveaway.id);
    setTitle(giveaway.title);
    setDescription(giveaway.description);
    setConditions(giveaway.conditions ?? '');
    setPaintingId(String(giveaway.painting.id));
    setDeadline(toDatetimeLocalValue(giveaway.deadline));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim() || !paintingId || !deadline) return;

    const dto = {
      title: title.trim(),
      description: description.trim(),
      conditions: conditions.trim(),
      paintingId: Number(paintingId),
      deadline: new Date(deadline).toISOString(),
    };

    try {
      if (editingId) {
        await giveawaysService.updateGiveaway(editingId, dto);
      } else {
        await giveawaysService.createGiveaway(dto);
      }
      resetForm();
      loadGiveaways();
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

  const handleDelete = async (giveaway: Giveaway) => {
    if (!window.confirm(`Видалити розіграш "${giveaway.title}"?`)) return;

    try {
      await giveawaysService.deleteGiveaway(giveaway.id);
      setGiveaways((prev) => prev.filter((item) => item.id !== giveaway.id));
      dispatch(showToast({ message: 'Розіграш видалено' }));
    } catch (error: any) {
      dispatch(
        showToast({
          message: error?.response?.data?.message ?? 'Не вдалося видалити',
          variant: 'error',
        }),
      );
    }
  };

  const paintingOptions = paintings.map((p) => ({
    value: String(p.id),
    label: p.title,
  }));

  return (
    <div>
      <h1 className={styles.title}>Розіграші</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          required
          placeholder="Назва розіграшу"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.input}
        />

        <Select
          value={paintingId}
          onChange={setPaintingId}
          options={paintingOptions}
          placeholder="Картина"
        />

        <input
          required
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className={styles.input}
        />

        <textarea
          required
          rows={4}
          placeholder="Опис розіграшу"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={styles.textarea}
        />

        <textarea
          rows={4}
          placeholder="Умови участі (необов'язково)"
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          className={styles.textarea}
        />

        <div className={styles.formActions}>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className={styles.cancelButton}
            >
              Скасувати
            </button>
          )}
          <button type="submit" className={styles.submitButton}>
            {editingId ? 'Зберегти' : 'Створити розіграш'}
          </button>
        </div>
      </form>

      {loading ? (
        <p className={styles.muted}>Завантаження…</p>
      ) : giveaways.length === 0 ? (
        <p className={styles.muted}>Розіграшів поки немає</p>
      ) : (
        <div className={styles.list}>
          {giveaways.map((giveaway) => (
            <div key={giveaway.id} className={styles.item}>
              <img
                src={giveaway.painting.cardImage}
                alt=""
                className={styles.itemImage}
              />
              <div className={styles.itemInfo}>
                <span className={styles.itemTitle}>{giveaway.title}</span>
                <span className={styles.itemMeta}>
                  {giveaway.painting.title} · {giveaway.participantsCount}{' '}
                  учасників · {giveaway.isActive ? 'активний' : 'завершено'}
                </span>
              </div>
              <div className={styles.itemActions}>
                <button
                  onClick={() => handleEdit(giveaway)}
                  className={styles.editButton}
                >
                  Редагувати
                </button>
                <button
                  onClick={() => handleDelete(giveaway)}
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
