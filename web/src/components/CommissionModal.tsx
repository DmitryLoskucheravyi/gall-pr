import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import type { Painting } from '../types/painting.types';
import type { NovaPoshtaOption } from '../types/novaPoshta.types';
import { ordersService } from '../api/orders.api';
import { useSettings } from '../hooks/queries/useSettings';
import { useAppSelector } from '../store/hooks';
import { useLocale } from '../hooks/useLocale';
import { pickLocale } from '../utils/localizedField';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useNovaPoshtaWarehouses } from '../hooks/queries/useNovaPoshta';
import NovaPoshtaCityPicker from './ui/NovaPoshtaCityPicker';
import Select from './ui/Select';
import { safeExternalUrl } from '../utils/safeUrl';
import styles from './CommissionModal.module.scss';

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as
  | string
  | undefined;

type Props = {
  painting: Painting;
  onClose: () => void;
};

// Ordering a repeat of a sold-out work.
//
// Deliberately not the cart and checkout: there is nothing in stock to reserve,
// no total to pay and no payment method that would mean anything yet. What the
// artist needs is who to talk to and roughly where it's going; everything else
// — size, timing, price — is the conversation this starts.
//
// The way out is as prominent as the form. Plenty of people would rather write
// two lines in a direct message than fill in anything at all, and pretending
// otherwise just loses them.
export default function CommissionModal({ painting, onClose }: Props) {
  const { t } = useTranslation('painting');
  const locale = useLocale();
  const title = pickLocale(painting, 'title', locale);
  useEscapeKey(onClose, true);

  const user = useAppSelector((state) => state.auth.user);
  const { data: settings } = useSettings();

  const [name, setName] = useState(
    user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '',
  );
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [contactHandle, setContactHandle] = useState('');
  // What the work cost the first time, which is both the starting figure and
  // the floor. A repeat is at least as much work as the original, so it can
  // go up but never down.
  const originalPrice = Number(painting.price);
  const [amount, setAmount] = useState(String(originalPrice));

  const [city, setCity] = useState<NovaPoshtaOption | null>(null);
  const [warehouseRef, setWarehouseRef] = useState('');
  const [comment, setComment] = useState('');

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backdropRef = useRef<HTMLDivElement>(null);

  // The panel is much shorter after sending than the form was, and whatever
  // the scroll position was for the form is meaningless for it — left alone,
  // the thank-you opens part-way down with its heading above the screen.
  useEffect(() => {
    if (sent) backdropRef.current?.scrollTo({ top: 0 });
  }, [sent]);

  // A dialog over a page that still scrolls underneath is a phone-sized
  // annoyance: the background slides away behind the panel at the first
  // stray touch.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const { data: warehouses = [] } = useNovaPoshtaWarehouses(city?.ref ?? null);

  // Blocks the submit and shows why, rather than letting the request go and
  // come back rejected — the server enforces the same floor, but finding out
  // after a round trip is a worse way to learn it.
  const belowOriginal =
    amount.trim() !== '' && Number(amount) < originalPrice;

  // Straight to the bot, carrying which painting this is about, so neither
  // side has to explain it: one tap on Start and the artist gets a message
  // naming the work and whom to answer. Telegram allows [A-Za-z0-9_-] in a
  // start payload, which `repeat_<id>` stays inside.
  //
  // Falls back to whatever URL the settings hold when the bot's username isn't
  // configured — the link still works, it just arrives without the context.
  const telegramUrl = TELEGRAM_BOT_USERNAME
    ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=repeat_${painting.id}`
    : safeExternalUrl(settings?.supportTelegramUrl);
  const instagramUrl = safeExternalUrl(settings?.instagramUrl);
  const hasDirectContact = !!telegramUrl || !!instagramUrl;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (belowOriginal) return;

    setError(null);
    setSending(true);

    try {
      await ordersService.createCommission({
        paintingId: painting.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        contactHandle: contactHandle.trim() || undefined,
        offeredPrice: Number(amount) || originalPrice,
        // Sent as a pair or not at all — a city without a branch is not an
        // address, and the server resolves the names from these refs.
        ...(city && warehouseRef
          ? { novaPoshtaCityRef: city.ref, novaPoshtaWarehouseRef: warehouseRef }
          : {}),
        comment: comment.trim() || undefined,
      });

      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('commission.genericError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      ref={backdropRef}
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <button
          type="button"
          onClick={onClose}
          className={styles.close}
          aria-label={t('commission.closeAria')}
        >
          ×
        </button>

        {sent ? (
          // No order number and no total on purpose: nothing has been bought,
          // and quoting a figure now would be a promise the artist hasn't made.
          <div className={styles.done}>
            <h2 className={styles.title}>{t('commission.done.title')}</h2>
            <p className={styles.lead}>
              {t('commission.done.lead', { title, email: email.trim() })}
            </p>
            <p className={styles.note}>{t('commission.done.note')}</p>
            <button type="button" onClick={onClose} className={styles.submit}>
              {t('commission.done.ok')}
            </button>
          </div>
        ) : (
          <>
            <h2 className={styles.title}>{t('commission.title')}</h2>
            <p className={styles.lead}>{t('commission.lead', { title })}</p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                required
                placeholder={t('commission.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
              />
              <input
                required
                type="tel"
                placeholder={t('commission.phonePlaceholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={styles.input}
              />

              {/* One field for both networks. Asking for a Telegram and an
                  Instagram separately makes someone fill in a box they don't
                  use, and which one this is is plain from what they type. */}
              <input
                placeholder={t('commission.contactPlaceholder')}
                value={contactHandle}
                onChange={(e) => setContactHandle(e.target.value)}
                className={styles.input}
              />

              <span className={styles.optional}>{t('commission.amountLabel')}</span>

              <div className={styles.amountRow}>
                <input
                  required
                  type="number"
                  inputMode="numeric"
                  min={originalPrice}
                  step={100}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${styles.input} ${
                    belowOriginal ? styles.inputInvalid : ''
                  }`}
                />
                <span className={styles.currency}>₴</span>
              </div>

              <p className={styles.amountHint}>
                {belowOriginal ? (
                  <span className={styles.error}>
                    {t('commission.amountBelowOriginal', {
                      price: originalPrice.toLocaleString('uk-UA'),
                    })}
                  </span>
                ) : (
                  <Trans
                    t={t}
                    i18nKey="commission.amountHint"
                    values={{ price: originalPrice.toLocaleString('uk-UA') }}
                    components={{ strong: <strong /> }}
                  />
                )}
              </p>

              <span className={styles.optional}>{t('commission.deliveryLabel')}</span>

              <NovaPoshtaCityPicker
                value={city}
                onChange={(next) => {
                  setCity(next);
                  setWarehouseRef('');
                }}
              />

              {city && (
                <Select
                  value={warehouseRef}
                  onChange={setWarehouseRef}
                  options={[
                    { value: '', label: t('commission.chooseWarehouse') },
                    ...warehouses.map((warehouse) => ({
                      value: warehouse.ref,
                      label: warehouse.name,
                    })),
                  ]}
                />
              )}

              <textarea
                placeholder={t('commission.commentPlaceholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className={styles.textarea}
              />

              {error && <p className={styles.error}>{error}</p>}

              <button
                type="submit"
                disabled={sending || belowOriginal}
                className={styles.submit}
              >
                {sending ? t('commission.sending') : t('commission.submit')}
              </button>
            </form>

            {hasDirectContact && (
              <div className={styles.alternative}>
                <span className={styles.or}>{t('commission.or')}</span>
                <div className={styles.links}>
                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.link}
                    >
                      {t('commission.instagram')}
                    </a>
                  )}
                  {telegramUrl && (
                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.link}
                    >
                      {t('commission.telegram')}
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
