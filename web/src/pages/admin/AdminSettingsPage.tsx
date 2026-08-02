import { useEffect, useState } from 'react';

import type { NovaPoshtaOption } from '../../types/novaPoshta.types';
import { useSettings } from '../../hooks/queries/useSettings';
import { useUpdateSettingsMutation } from '../../hooks/mutations/useSettingsMutation';
import Skeleton from '../../components/ui/Skeleton';
import NovaPoshtaCityPicker from '../../components/ui/NovaPoshtaCityPicker';
import FaqAdminEditor from '../../components/admin/FaqAdminEditor';
import styles from './AdminSettingsPage.module.scss';

export default function AdminSettingsPage() {
  const { data: settings, isLoading: loading } = useSettings();
  const updateSettings = useUpdateSettingsMutation();
  const [authorName, setAuthorNameInput] = useState('');
  const [cardTransferIban, setCardTransferIban] = useState('');
  const [senderCity, setSenderCity] = useState<NovaPoshtaOption | null>(null);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportTelegramUrl, setSupportTelegramUrl] = useState('');
  const [adminTelegramChatId, setAdminTelegramChatId] = useState('');

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
      setSupportEmail(settings.supportEmail);
      setSupportPhone(settings.supportPhone);
      setSupportTelegramUrl(settings.supportTelegramUrl);
      setAdminTelegramChatId(settings.adminTelegramChatId);
    }
  }, [settings]);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    updateSettings.mutate({
      authorName: authorName.trim(),
      cardTransferIban: cardTransferIban.trim(),
      novaPoshtaSenderCityRef: senderCity?.ref ?? '',
      novaPoshtaSenderCityName: senderCity?.name ?? '',
      supportEmail: supportEmail.trim(),
      supportPhone: supportPhone.trim(),
      supportTelegramUrl: supportTelegramUrl.trim(),
      adminTelegramChatId: adminTelegramChatId.trim(),
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

        <label className={styles.label}>Email підтримки</label>
        <p className={styles.hint}>
          Показується в чаті підтримки як додатковий спосіб зв'язку
        </p>

        <input
          type="email"
          value={supportEmail}
          onChange={(e) => setSupportEmail(e.target.value)}
          placeholder="support@viktorumm.com"
          className={styles.input}
        />

        <label className={styles.label}>Телефон підтримки</label>
        <p className={styles.hint}>Показується в чаті підтримки</p>

        <input
          type="tel"
          value={supportPhone}
          onChange={(e) => setSupportPhone(e.target.value)}
          placeholder="+380 00 000 0000"
          className={styles.input}
        />

        <label className={styles.label}>Посилання на Telegram</label>
        <p className={styles.hint}>
          Наприклад, на Telegram-бота підтримки (https://t.me/…)
        </p>

        <input
          type="url"
          value={supportTelegramUrl}
          onChange={(e) => setSupportTelegramUrl(e.target.value)}
          placeholder="https://t.me/viktorumm_bot"
          className={styles.input}
        />

        <label className={styles.label}>Telegram чат адміна</label>
        <p className={styles.hint}>
          Сюди бот надсилатиме сповіщення про нові замовлення, скріни оплати й
          повідомлення в підтримці. Напишіть боту /start — він відповість вашим
          Chat ID, вставте його сюди.
        </p>

        <input
          value={adminTelegramChatId}
          onChange={(e) => setAdminTelegramChatId(e.target.value)}
          placeholder="123456789"
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

      <h2 className={styles.sectionTitle}>FAQ</h2>
      <p className={styles.hint}>
        Питання й відповіді, що показуються в розділі підтримки. Перетягуйте
        картки, щоб змінити порядок.
      </p>

      <FaqAdminEditor />
    </div>
  );
}
