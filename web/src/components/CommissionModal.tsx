import { useState } from 'react';

import type { Painting } from '../types/painting.types';
import type { NovaPoshtaOption } from '../types/novaPoshta.types';
import { ordersService } from '../api/orders.api';
import { useSettings } from '../hooks/queries/useSettings';
import { useAppSelector } from '../store/hooks';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useNovaPoshtaWarehouses } from '../hooks/queries/useNovaPoshta';
import NovaPoshtaCityPicker from './ui/NovaPoshtaCityPicker';
import Select from './ui/Select';
import { safeExternalUrl } from '../utils/safeUrl';
import styles from './CommissionModal.module.scss';

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
  useEscapeKey(onClose, true);

  const user = useAppSelector((state) => state.auth.user);
  const { data: settings } = useSettings();

  const [name, setName] = useState(
    user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '',
  );
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [city, setCity] = useState<NovaPoshtaOption | null>(null);
  const [warehouseRef, setWarehouseRef] = useState('');
  const [comment, setComment] = useState('');

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: warehouses = [] } = useNovaPoshtaWarehouses(city?.ref ?? null);

  const telegramUrl = safeExternalUrl(settings?.supportTelegramUrl);
  const instagramUrl = safeExternalUrl(settings?.instagramUrl);
  const hasDirectContact = !!telegramUrl || !!instagramUrl;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSending(true);

    try {
      await ordersService.createCommission({
        paintingId: painting.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        // Sent as a pair or not at all — a city without a branch is not an
        // address, and the server resolves the names from these refs.
        ...(city && warehouseRef
          ? { novaPoshtaCityRef: city.ref, novaPoshtaWarehouseRef: warehouseRef }
          : {}),
        comment: comment.trim() || undefined,
      });

      setSent(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? 'Не вдалося надіслати. Спробуйте ще раз',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
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
          aria-label="Закрити"
        >
          ×
        </button>

        {sent ? (
          // No order number and no total on purpose: nothing has been bought,
          // and quoting a figure now would be a promise the artist hasn't made.
          <div className={styles.done}>
            <h2 className={styles.title}>Дякуємо!</h2>
            <p className={styles.lead}>
              Ми отримали ваше замовлення на повтор роботи «{painting.title}» і
              надіслали підтвердження на {email.trim()}.
            </p>
            <p className={styles.note}>
              Найближчим часом звʼяжемося, щоб узгодити розмір, терміни й
              вартість. Кожен повтор пишеться вручну, тож він буде близьким до
              оригіналу, але не тотожним йому.
            </p>
            <button type="button" onClick={onClose} className={styles.submit}>
              Зрозуміло
            </button>
          </div>
        ) : (
          <>
            <h2 className={styles.title}>Замовити повтор</h2>
            <p className={styles.lead}>
              «{painting.title}» вже продана, але автор може написати її знову.
              Залиште контакти — ми звʼяжемося, щоб узгодити деталі.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                required
                placeholder="Ваше імʼя"
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
                placeholder="Телефон"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={styles.input}
              />

              <span className={styles.optional}>
                Доставка — якщо вже знаєте, куди
              </span>

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
                    { value: '', label: 'Оберіть відділення' },
                    ...warehouses.map((warehouse) => ({
                      value: warehouse.ref,
                      label: warehouse.name,
                    })),
                  ]}
                />
              )}

              <textarea
                placeholder="Побажання: розмір, кольори, терміни"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className={styles.textarea}
              />

              {error && <p className={styles.error}>{error}</p>}

              <button
                type="submit"
                disabled={sending}
                className={styles.submit}
              >
                {sending ? 'Надсилаємо…' : 'Надіслати замовлення'}
              </button>
            </form>

            {hasDirectContact && (
              <div className={styles.alternative}>
                <span className={styles.or}>або напишіть напряму</span>
                <div className={styles.links}>
                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.link}
                    >
                      Instagram Direct
                    </a>
                  )}
                  {telegramUrl && (
                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.link}
                    >
                      Telegram
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
