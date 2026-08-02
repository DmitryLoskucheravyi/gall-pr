import { useEffect, useState } from 'react';

import type { NovaPoshtaOption } from '../../types/novaPoshta.types';
import { useSettings } from '../../hooks/queries/useSettings';
import {
  useUpdateSettingsMutation,
  useAdminTelegramLinkMutation,
  useResetAdminTelegramLinkMutation,
} from '../../hooks/mutations/useSettingsMutation';
import Skeleton from '../../components/ui/Skeleton';
import NovaPoshtaCityPicker from '../../components/ui/NovaPoshtaCityPicker';
import FaqAdminEditor from '../../components/admin/FaqAdminEditor';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import styles from './AdminSettingsPage.module.scss';

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as
  | string
  | undefined;

export default function AdminSettingsPage() {
  const { data: settings, isLoading: loading } = useSettings();
  const updateSettings = useUpdateSettingsMutation();
  const adminTelegramLink = useAdminTelegramLinkMutation();
  const resetAdminTelegramLink = useResetAdminTelegramLinkMutation();
  const confirm = useConfirm();
  const [authorName, setAuthorNameInput] = useState('');
  const [cardTransferIban, setCardTransferIban] = useState('');
  const [senderCity, setSenderCity] = useState<NovaPoshtaOption | null>(null);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportTelegramUrl, setSupportTelegramUrl] = useState('');
  const [linkOpened, setLinkOpened] = useState(false);

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
    });
  };

  const handleAdminTelegramLink = async () => {
    const { code } = await adminTelegramLink.mutateAsync();
    window.open(
      `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`,
      '_blank',
      'noopener,noreferrer',
    );
    setLinkOpened(true);
  };

  const handleResetAdminTelegramLink = async () => {
    const ok = await confirm({
      title: "Скинути прив'язку бота?",
      message:
        'Сповіщення адміну перестануть надходити, доки ви не привʼяжете бота знову.',
      confirmLabel: 'Скинути',
      danger: true,
    });
    if (!ok) return;
    setLinkOpened(false);
    resetAdminTelegramLink.mutate();
  };

  if (loading) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>Налаштування</h1>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Бренд</h2>
            <Skeleton className={styles.skeletonInput} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Налаштування</h1>

      <form onSubmit={handleSave}>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Бренд</h2>

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
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Оплата та доставка</h2>

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

            <label className={styles.label}>
              Місто відправлення (Нова пошта)
            </label>
            <p className={styles.hint}>
              Звідки рахується вартість доставки й комісія за накладений
              платіж
            </p>

            <NovaPoshtaCityPicker value={senderCity} onChange={setSenderCity} />
          </div>

          <div className={`${styles.card} ${styles.cardWide}`}>
            <h2 className={styles.cardTitle}>Контакти підтримки</h2>
            <p className={styles.hint}>
              Показуються в чаті підтримки як альтернативні способи звʼязку
            </p>

            <div className={styles.subGrid}>
              <div>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@viktorumm.com"
                  className={styles.input}
                />
              </div>

              <div>
                <label className={styles.label}>Телефон</label>
                <input
                  type="tel"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  placeholder="+380 00 000 0000"
                  className={styles.input}
                />
              </div>

              <div>
                <label className={styles.label}>Посилання на Telegram</label>
                <input
                  type="url"
                  value={supportTelegramUrl}
                  onChange={(e) => setSupportTelegramUrl(e.target.value)}
                  placeholder="https://t.me/viktorumm_bot"
                  className={styles.input}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={updateSettings.isPending}
          className={styles.saveButton}
        >
          {updateSettings.isPending ? 'Зберігаємо…' : 'Зберегти'}
        </button>
      </form>

      <div className={`${styles.card} ${styles.standaloneCard}`}>
        <h2 className={styles.cardTitle}>Бот сповіщень</h2>
        <p className={styles.hint}>
          Сюди бот надсилатиме сповіщення про нові замовлення, скріни оплати й
          повідомлення в підтримці.
        </p>

        {settings?.adminTelegramChatId ? (
          <div className={styles.telegramLinkedRow}>
            <p className={styles.telegramLinked}>✓ Бот привʼязано</p>
            <button
              type="button"
              onClick={handleResetAdminTelegramLink}
              disabled={resetAdminTelegramLink.isPending}
              className={styles.telegramResetButton}
            >
              Скинути
            </button>
          </div>
        ) : !TELEGRAM_BOT_USERNAME ? (
          <p className={styles.hint}>Незабаром</p>
        ) : (
          <>
            <button
              type="button"
              onClick={handleAdminTelegramLink}
              disabled={adminTelegramLink.isPending}
              className={styles.telegramButton}
            >
              {linkOpened
                ? 'Відкрити ще раз'
                : adminTelegramLink.isPending
                  ? 'Генеруємо…'
                  : "Привʼязати бота"}
            </button>
            {linkOpened && (
              <p className={styles.hint}>
                Натисніть Start у Telegram — бот звʼяжеться автоматично
              </p>
            )}
          </>
        )}
      </div>

      <div className={`${styles.card} ${styles.standaloneCard}`}>
        <h2 className={styles.cardTitle}>FAQ</h2>
        <p className={styles.hint}>
          Питання й відповіді, що показуються в розділі підтримки. Перетягуйте
          картки, щоб змінити порядок.
        </p>

        <FaqAdminEditor />
      </div>
    </div>
  );
}
