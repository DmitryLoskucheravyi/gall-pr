'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import StarRating from './ui/StarRating';
import { useCreateReviewMutation } from '../hooks/mutations/useReviewMutations';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useLocale } from '../hooks/useLocale';
import { cdnImage } from '../utils/imageUrl';
import { pickLocale } from '../utils/localizedField';
import type { Order } from '../types/order.types';
import styles from './ReviewModal.module.scss';

// The review form, for one delivered order. Opened three ways — the button on
// the order, the link in the thank-you letter (/orders?review=<id>), and the
// prompt that appears by itself on the customer's next visit — and the same
// in all of them, except that the prompt offers "not now" instead of a bare
// close, because it was not asked for.
//
// Sent once: the customer cannot edit it afterwards, which the form says
// before they send, not after.

const MIN = 10;
const MAX = 1500;

type Props = {
  order: Order;
  onClose: () => void;
  /** Opened by itself rather than by the customer. */
  prompted?: boolean;
  onLater?: () => void;
};

export default function ReviewModal({ order, onClose, prompted = false, onLater }: Props) {
  const { t } = useTranslation('orders');
  const locale = useLocale();
  const create = useCreateReviewMutation();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  useEscapeKey(onClose, true);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const length = text.trim().length;
  const ready = rating > 0 && length >= MIN && length <= MAX;
  const works = order.items.map((item) => item.painting);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    create.mutate(
      { orderId: order.id, rating, text: text.trim() },
      { onSuccess: () => setSent(true) },
    );
  };

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="review-title">
        <button type="button" className={styles.close} onClick={onClose} aria-label={t('review.close')}>
          ×
        </button>

        {sent ? (
          <div className={styles.thanks}>
            <StarRating value={rating} size={26} />
            <h2 id="review-title" className={styles.title}>
              {t('review.thanksTitle')}
            </h2>
            <p className={styles.lead}>{t('review.thanksText')}</p>
            <button type="button" className={styles.submit} onClick={onClose}>
              {t('review.done')}
            </button>
          </div>
        ) : (
          <>
            <p className={styles.kicker}>{t('orderNumber', { id: order.id })}</p>
            <h2 id="review-title" className={styles.title}>
              {prompted ? t('review.promptTitle') : t('review.title')}
            </h2>
            <p className={styles.lead}>{t('review.lead')}</p>

            <ul className={styles.works}>
              {works.map((painting) => (
                <li key={painting.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cdnImage(painting.cardImage, 160)} alt="" className={styles.thumb} />
                  <span>{pickLocale(painting, 'title', locale)}</span>
                </li>
              ))}
            </ul>

            <form onSubmit={submit} className={styles.form}>
              <div className={styles.field}>
                <span className={styles.label}>{t('review.ratingLabel')}</span>
                <StarRating value={rating} onChange={setRating} size={30} label={t('review.ratingLabel')} />
              </div>

              <label className={styles.field}>
                <span className={styles.label}>{t('review.textLabel')}</span>
                <textarea
                  className={styles.textarea}
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX))}
                  placeholder={t('review.textPlaceholder')}
                  rows={5}
                  required
                  minLength={MIN}
                  maxLength={MAX}
                />
                <span className={styles.counter} data-short={(length > 0 && length < MIN) || undefined}>
                  {length < MIN ? t('review.minChars', { count: MIN - length }) : `${length} / ${MAX}`}
                </span>
              </label>

              <p className={styles.note}>{t('review.note')}</p>

              <button type="submit" className={styles.submit} disabled={!ready || create.isPending}>
                {create.isPending ? t('review.sending') : t('review.send')}
              </button>

              {prompted ? (
                <button type="button" className={styles.later} onClick={onLater ?? onClose}>
                  {t('review.later')}
                </button>
              ) : null}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
