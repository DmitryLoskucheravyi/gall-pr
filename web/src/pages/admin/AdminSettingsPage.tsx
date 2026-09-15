import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NovaPoshtaOption } from '../../types/novaPoshta.types';
import { useAdminSettings } from '../../hooks/queries/useSettings';
import { usePaintings } from '../../hooks/queries/usePaintings';
import {
  useUpdateSettingsMutation,
  useAdminTelegramLinkMutation,
  useResetAdminTelegramLinkMutation,
} from '../../hooks/mutations/useSettingsMutation';
import Skeleton from '../../components/ui/Skeleton';
import NovaPoshtaCityPicker from '../../components/ui/NovaPoshtaCityPicker';
import Select from '../../components/ui/Select';
import FaqAdminEditor from '../../components/admin/FaqAdminEditor';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import styles from './AdminSettingsPage.module.scss';

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as
  string | undefined;

export default function AdminSettingsPage() {
  const { t } = useTranslation('admin');
  const { data: settings, isLoading: loading } = useAdminSettings();
  const updateSettings = useUpdateSettingsMutation();
  const adminTelegramLink = useAdminTelegramLinkMutation();
  const resetAdminTelegramLink = useResetAdminTelegramLinkMutation();
  const confirm = useConfirm();
  const [authorName, setAuthorNameInput] = useState('');
  const [authorNameEn, setAuthorNameEnInput] = useState('');
  const [cardTransferIban, setCardTransferIban] = useState('');
  const [senderCity, setSenderCity] = useState<NovaPoshtaOption | null>(null);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportTelegramUrl, setSupportTelegramUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  // Three hero slots, held as one array so the picker below is a loop rather
  // than three near-identical blocks.
  const [heroPaintingIds, setHeroPaintingIds] = useState<Array<number | null>>([
    null,
    null,
    null,
  ]);
  const [linkOpened, setLinkOpened] = useState(false);

  // Same filter the home page uses to build its own fallback, so the list
  // here can't offer a painting the hero would refuse to show.
  const { data: paintingsResponse, isLoading: paintingsLoading } = usePaintings(
    {
      page: 1,
      limit: 200,
      isAvailable: true,
    },
  );
  const heroOptions = paintingsResponse?.data ?? [];

  useEffect(() => {
    if (settings) {
      setAuthorNameInput(settings.authorName);
      setAuthorNameEnInput(settings.authorNameEn ?? '');
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
      setInstagramUrl(settings.instagramUrl);
      setHeroPaintingIds([
        settings.heroPaintingId1,
        settings.heroPaintingId2,
        settings.heroPaintingId3,
      ]);
    }
  }, [settings]);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    updateSettings.mutate({
      authorName: authorName.trim(),
      authorNameEn: authorNameEn.trim() || undefined,
      cardTransferIban: cardTransferIban.trim(),
      novaPoshtaSenderCityRef: senderCity?.ref ?? '',
      novaPoshtaSenderCityName: senderCity?.name ?? '',
      supportEmail: supportEmail.trim(),
      supportPhone: supportPhone.trim(),
      supportTelegramUrl: supportTelegramUrl.trim(),
      instagramUrl: instagramUrl.trim(),
      heroPaintingId1: heroPaintingIds[0],
      heroPaintingId2: heroPaintingIds[1],
      heroPaintingId3: heroPaintingIds[2],
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
      title: t('settingsPage.bot.confirmReset.title'),
      message: t('settingsPage.bot.confirmReset.message'),
      confirmLabel: t('settingsPage.bot.confirmReset.confirmLabel'),
      danger: true,
    });
    if (!ok) return;
    setLinkOpened(false);
    resetAdminTelegramLink.mutate();
  };

  if (loading) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>{t('settingsPage.title')}</h1>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t('settingsPage.brand.cardTitle')}</h2>
            <Skeleton className={styles.skeletonInput} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{t('settingsPage.title')}</h1>

      <form onSubmit={handleSave}>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t('settingsPage.brand.cardTitle')}</h2>

            <label className={styles.label}>
              {t('settingsPage.brand.currentAuthorLabel')}
            </label>
            <p className={styles.hint}>{t('settingsPage.brand.hint')}</p>

            <input
              value={authorName}
              onChange={(e) => setAuthorNameInput(e.target.value)}
              placeholder={t('settingsPage.brand.namePlaceholder')}
              className={styles.input}
            />
            <input
              value={authorNameEn}
              onChange={(e) => setAuthorNameEnInput(e.target.value)}
              placeholder={t('settingsPage.brand.nameEnPlaceholder')}
              className={styles.input}
            />
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t('settingsPage.home.cardTitle')}</h2>

            <label className={styles.label}>{t('settingsPage.home.heroLabel')}</label>
            <p className={styles.hint}>{t('settingsPage.home.hint')}</p>

            <div className={styles.heroSlots}>
              {heroPaintingIds.map((selected, slot) => (
                <Select
                  key={slot}
                  value={selected === null ? '' : String(selected)}
                  onChange={(next) =>
                    setHeroPaintingIds((prev) =>
                      prev.map((value, i) =>
                        i === slot ? (next ? Number(next) : null) : value,
                      ),
                    )
                  }
                  // "Auto" is a real option rather than the placeholder, so a
                  // slot that's been set can be cleared back to it.
                  options={[
                    { value: '', label: t('settingsPage.home.auto') },
                    ...heroOptions.map((painting) => ({
                      value: String(painting.id),
                      label: painting.title,
                    })),
                  ]}
                  disabled={paintingsLoading}
                  ariaLabel={t('settingsPage.home.slotAria', { slot: slot + 1 })}
                />
              ))}
            </div>

            {/* A saved painting can go missing later — deleted, sold or
                hidden. Say so instead of silently snapping that slot back to
                "Auto". */}
            {!paintingsLoading &&
              heroPaintingIds.some(
                (selected) =>
                  selected !== null &&
                  !heroOptions.some((painting) => painting.id === selected),
              ) && (
                <p className={styles.hint}>{t('settingsPage.home.missingHint')}</p>
              )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t('settingsPage.payment.cardTitle')}</h2>

            <label className={styles.label}>{t('settingsPage.payment.ibanLabel')}</label>
            <p className={styles.hint}>{t('settingsPage.payment.ibanHint')}</p>

            <input
              value={cardTransferIban}
              onChange={(e) => setCardTransferIban(e.target.value)}
              placeholder="UA00 0000 0000 0000 0000 0000 000"
              className={styles.input}
            />

            <label className={styles.label}>
              {t('settingsPage.payment.senderCityLabel')}
            </label>
            <p className={styles.hint}>{t('settingsPage.payment.senderCityHint')}</p>

            <NovaPoshtaCityPicker value={senderCity} onChange={setSenderCity} />
          </div>

          <div className={`${styles.card} ${styles.cardWide}`}>
            <h2 className={styles.cardTitle}>{t('settingsPage.support.cardTitle')}</h2>
            <p className={styles.hint}>{t('settingsPage.support.hint')}</p>

            <div className={styles.subGrid}>
              <div>
                <label className={styles.label}>{t('settingsPage.support.email')}</label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@viktorumm.com"
                  className={styles.input}
                />
              </div>

              <div>
                <label className={styles.label}>{t('settingsPage.support.phone')}</label>
                <input
                  type="tel"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  placeholder="+380 00 000 0000"
                  className={styles.input}
                />
              </div>

              <div>
                <label className={styles.label}>{t('settingsPage.support.telegram')}</label>
                <input
                  type="url"
                  value={supportTelegramUrl}
                  onChange={(e) => setSupportTelegramUrl(e.target.value)}
                  placeholder="https://t.me/viktorumm_bot"
                  className={styles.input}
                />
              </div>

              <div>
                <label className={styles.label}>
                  {t('settingsPage.support.instagram')}
                </label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/viktorumm"
                  className={styles.input}
                />
                <p className={styles.hint}>{t('settingsPage.support.instagramHint')}</p>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={updateSettings.isPending}
          className={styles.saveButton}
        >
          {updateSettings.isPending
            ? t('settingsPage.saving')
            : t('settingsPage.save')}
        </button>
      </form>

      <div className={`${styles.card} ${styles.standaloneCard}`}>
        <h2 className={styles.cardTitle}>{t('settingsPage.bot.cardTitle')}</h2>
        <p className={styles.hint}>{t('settingsPage.bot.hint')}</p>

        {settings?.adminTelegramChatId ? (
          <div className={styles.telegramLinkedRow}>
            <p className={styles.telegramLinked}>{t('settingsPage.bot.linked')}</p>
            <button
              type="button"
              onClick={handleResetAdminTelegramLink}
              disabled={resetAdminTelegramLink.isPending}
              className={styles.telegramResetButton}
            >
              {t('settingsPage.bot.reset')}
            </button>
          </div>
        ) : !TELEGRAM_BOT_USERNAME ? (
          <p className={styles.hint}>{t('settingsPage.bot.soon')}</p>
        ) : (
          <>
            <button
              type="button"
              onClick={handleAdminTelegramLink}
              disabled={adminTelegramLink.isPending}
              className={styles.telegramButton}
            >
              {linkOpened
                ? t('settingsPage.bot.openAgain')
                : adminTelegramLink.isPending
                  ? t('settingsPage.bot.generating')
                  : t('settingsPage.bot.link')}
            </button>
            {linkOpened && (
              <p className={styles.hint}>{t('settingsPage.bot.startHint')}</p>
            )}
          </>
        )}
      </div>

      <div className={`${styles.card} ${styles.standaloneCard}`}>
        <h2 className={styles.cardTitle}>{t('settingsPage.faq.cardTitle')}</h2>
        <p className={styles.hint}>{t('settingsPage.faq.hint')}</p>

        <FaqAdminEditor />
      </div>
    </div>
  );
}
