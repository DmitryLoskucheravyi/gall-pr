import { useEffect, useState } from 'react';

import { settingsService } from '../../api/settings.api';
import { useAppDispatch } from '../../store/hooks';
import { setAuthorName } from '../../store/slices/settingsSlice';
import { showToast } from '../../store/slices/toastSlice';
import styles from './AdminSettingsPage.module.scss';

export default function AdminSettingsPage() {
  const dispatch = useAppDispatch();
  const [authorName, setAuthorNameInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsService
      .getSettings()
      .then((settings) => setAuthorNameInput(settings.authorName))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSaving(true);
      const settings = await settingsService.updateSettings(
        authorName.trim(),
      );
      dispatch(setAuthorName(settings.authorName));
      dispatch(showToast({ message: 'Автора оновлено на всіх картинах' }));
    } catch (error: any) {
      dispatch(
        showToast({
          message: error?.response?.data?.message ?? 'Не вдалося зберегти',
          variant: 'error',
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className={styles.hint}>Завантаження…</p>;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Налаштування</h1>

      <form onSubmit={handleSave} className={styles.form}>
        <label className={styles.label}>Поточний автор</label>
        <p className={styles.hint}>
          Цей автор відображатиметься на всіх картинах у каталозі
        </p>

        <input
          value={authorName}
          onChange={(e) => setAuthorNameInput(e.target.value)}
          placeholder="Ім'я автора"
          className={styles.input}
        />

        <button type="submit" disabled={saving} className={styles.saveButton}>
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
      </form>
    </div>
  );
}
