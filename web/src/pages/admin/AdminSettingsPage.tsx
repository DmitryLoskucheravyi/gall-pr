import { useEffect, useState } from 'react';

import { useSettings } from '../../hooks/queries/useSettings';
import { useUpdateSettingsMutation } from '../../hooks/mutations/useSettingsMutation';
import Skeleton from '../../components/ui/Skeleton';
import styles from './AdminSettingsPage.module.scss';

export default function AdminSettingsPage() {
  const { data: settings, isLoading: loading } = useSettings();
  const updateSettings = useUpdateSettingsMutation();
  const [authorName, setAuthorNameInput] = useState('');

  useEffect(() => {
    if (settings) setAuthorNameInput(settings.authorName);
  }, [settings]);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    updateSettings.mutate(authorName.trim());
  };

  if (loading) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>Налаштування</h1>
        <div className={styles.form}>
          <label className={styles.label}>Поточний автор</label>
          <p className={styles.hint}>
            Цей автор відображатиметься на всіх картинах у каталозі
          </p>
          <Skeleton className={styles.skeletonInput} />
        </div>
      </div>
    );
  }

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

        <button
          type="submit"
          disabled={updateSettings.isPending}
          className={styles.saveButton}
        >
          {updateSettings.isPending ? 'Зберігаємо…' : 'Зберегти'}
        </button>
      </form>
    </div>
  );
}
