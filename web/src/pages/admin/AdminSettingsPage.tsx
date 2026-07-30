import { useEffect, useState } from 'react';

import type { NovaPoshtaOption } from '../../types/novaPoshta.types';
import { useSettings } from '../../hooks/queries/useSettings';
import { useUpdateSettingsMutation } from '../../hooks/mutations/useSettingsMutation';
import Skeleton from '../../components/ui/Skeleton';
import NovaPoshtaCityPicker from '../../components/ui/NovaPoshtaCityPicker';
import styles from './AdminSettingsPage.module.scss';

export default function AdminSettingsPage() {
  const { data: settings, isLoading: loading } = useSettings();
  const updateSettings = useUpdateSettingsMutation();
  const [authorName, setAuthorNameInput] = useState('');
  const [cardTransferIban, setCardTransferIban] = useState('');
  const [senderCity, setSenderCity] = useState<NovaPoshtaOption | null>(null);

  useEffect(() => {
    if (settings) {
      setAuthorNameInput(settings.authorName);
      setCardTransferIban(settings.cardTransferIban);
      setSenderCity(
        settings.novaPoshtaSenderCityRef
          ? {
              ref: settings.novaPoshtaSenderCityRef,
              name: settings.novaPoshtaSenderCityName,
            }
          : null,
      );
    }
  }, [settings]);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    updateSettings.mutate({
      authorName: authorName.trim(),
      cardTransferIban: cardTransferIban.trim(),
      novaPoshtaSenderCityRef: senderCity?.ref ?? '',
      novaPoshtaSenderCityName: senderCity?.name ?? '',
    });
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

        <label className={styles.label}>IBAN для переказу на карту</label>
        <p className={styles.hint}>
          Показується покупцю, коли він обирає оплату "Переказ на карту"
        </p>

        <input
          value={cardTransferIban}
          onChange={(e) => setCardTransferIban(e.target.value)}
          placeholder="UA00 0000 0000 0000 0000 0000 000"
          className={styles.input}
        />

        <label className={styles.label}>Місто відправлення (Нова пошта)</label>
        <p className={styles.hint}>
          Звідки рахується вартість доставки й комісія за накладений платіж
        </p>

        <NovaPoshtaCityPicker value={senderCity} onChange={setSenderCity} />

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
