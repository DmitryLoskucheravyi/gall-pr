import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Painting } from '../types/painting.types';
import { ordersService } from '../api/orders.api';
import { useSettings } from '../hooks/queries/useSettings';
import { useAppSelector } from '../store/hooks';
import { useLocale } from '../hooks/useLocale';
import { pickLocale } from '../utils/localizedField';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { safeExternalUrl } from '../utils/safeUrl';
import styles from './CommissionModal.module.scss';
import { apiErrorMessage } from '../utils/apiError';
import { cdnImage } from '../utils/imageUrl';

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME as
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
  const priceLocale = locale === 'en' ? 'en-GB' : 'uk-UA';
  useEscapeKey(onClose, true);

  const user = useAppSelector((state) => state.auth.user);
  const { data: settings } = useSettings();

  const [name, setName] = useState(
    user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '',
  );
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [contactHandle, setContactHandle] = useState('');
  // What the work cost the first time — shown as the starting point. The form
  // asks no price and no delivery: the artist agrees both with the customer
  // directly, so all it collects is how to reach them.
  const originalPrice = Number(painting.price);

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

    setError(null);
    setSending(true);

    try {
      await ordersService.createCommission({
        paintingId: painting.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        contactHandle: contactHandle.trim() || undefined,
        comment: comment.trim() || undefined,
      });

      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err, t('commission.genericError')));
    } finally {
      setSending(false);
    }
  };

  // Instagram / Telegram: in the left column on a desktop, under the form on
  // a phone — one block, placed by the stylesheet.
  const directLinks = (placement: string) => (
    <div className={`${styles.alternative} ${placement}`}>
      <span className={styles.or}>{t('commission.or')}</span>
      <div className={styles.links}>
        {instagramUrl && (
          <a href={instagramUrl} target="_blank" rel="noreferrer" className={styles.link}>
            {t('commission.instagram')}
          </a>
        )}
        {telegramUrl && (
          <a href={telegramUrl} target="_blank" rel="noreferrer" className={styles.link}>
            {t('commission.telegram')}
          </a>
        )}
      </div>
    </div>
  );

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
          // Two columns on a desktop: the work and how this goes on the left,
          // the form on the right in labelled sections. One column on a phone,
          // where the work shrinks to a line at the top of the sheet.
          <div className={styles.layout}>
            <aside className={styles.aside}>
              <figure className={styles.work}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cdnImage(painting.cardImage, 600)} alt="" />
              </figure>

              <div className={styles.workMeta}>
                <span className={styles.kicker}>{t('commission.kicker')}</span>
                <h2 className={styles.title}>{t('commission.title')}</h2>
                <p className={styles.workTitle}>«{title}»</p>
                <p className={styles.floor}>
                  {t('commission.floor', { price: originalPrice.toLocaleString(priceLocale) })}
                </p>
              </div>

              <ol className={styles.howto}>
                {(['one', 'two', 'three'] as const).map((step, index) => (
                  <li key={step}>
                    <span className={styles.howtoNumber}>{String(index + 1).padStart(2, '0')}</span>
                    {t(`commission.steps.${step}`)}
                  </li>
                ))}
              </ol>

              {hasDirectContact && directLinks(styles.altDesktop)}
            </aside>

            <form onSubmit={handleSubmit} className={styles.form}>
              <p className={styles.lead}>{t('commission.lead', { title })}</p>

              <fieldset className={styles.section}>
                <legend className={styles.legend}>{t('commission.contactsLabel')}</legend>
                <div className={styles.grid}>
                  <input
                    required
                    placeholder={t('commission.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={styles.input}
                    autoComplete="name"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                    autoComplete="email"
                  />
                  <input
                    required
                    type="tel"
                    placeholder={t('commission.phonePlaceholder')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={styles.input}
                    autoComplete="tel"
                  />
                  {/* One field for both networks: which one it is is plain
                      from what they type. */}
                  <input
                    placeholder={t('commission.contactPlaceholder')}
                    value={contactHandle}
                    onChange={(e) => setContactHandle(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </fieldset>

              <fieldset className={styles.section}>
                <legend className={styles.legend}>{t('commission.commentLabel')}</legend>
                <textarea
                  placeholder={t('commission.commentPlaceholder')}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className={styles.textarea}
                />
              </fieldset>

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" disabled={sending} className={styles.submit}>
                {sending ? t('commission.sending') : t('commission.submit')}
              </button>

              {/* On a phone the way out comes after the form, not before it. */}
              {hasDirectContact && directLinks(styles.altMobile)}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
