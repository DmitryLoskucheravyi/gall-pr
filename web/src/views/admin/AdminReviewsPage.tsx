'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import StarRating from '../../components/ui/StarRating';
import Skeleton from '../../components/ui/Skeleton';
import { LocalizedLink as Link } from '../../components/ui/LocalizedLink';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAdminReviews } from '../../hooks/queries/useReviews';
import {
  useDeleteReviewMutation,
  useUpdateReviewMutation,
} from '../../hooks/mutations/useReviewMutations';
import { useLocale } from '../../hooks/useLocale';
import { cdnImage } from '../../utils/imageUrl';
import { pickLocale } from '../../utils/localizedField';
import type { AdminReview } from '../../types/review.types';
import styles from './AdminReviewsPage.module.scss';

// Every review customers have sent, and the one place they reach the site
// from: nothing is shown until it is switched on here. The admin can also
// correct the text or the stars (a customer cannot), or remove a review.

type Tab = 'pending' | 'published' | 'all';

export default function AdminReviewsPage() {
  const { t } = useTranslation('admin');
  const { data: reviews = [], isLoading } = useAdminReviews();
  const [tab, setTab] = useState<Tab>('pending');

  const pending = reviews.filter((r) => !r.isPublished);
  const shown =
    tab === 'pending' ? pending : tab === 'published' ? reviews.filter((r) => r.isPublished) : reviews;

  return (
    <div>
      <h1 className={styles.title}>{t('reviewsPage.title')}</h1>
      <p className={styles.lead}>{t('reviewsPage.lead')}</p>

      <div className={styles.tabs} role="tablist">
        {(['pending', 'published', 'all'] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={styles.tab}
            data-active={tab === key || undefined}
            onClick={() => setTab(key)}
          >
            {t(`reviewsPage.tabs.${key}`)}
            {key === 'pending' && pending.length > 0 ? (
              <span className={styles.badge}>{pending.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className={styles.muted}>{t(`reviewsPage.empty.${tab}`)}</p>
      ) : (
        <div className={styles.list}>
          {shown.map((review) => (
            <ReviewRow key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewRow({ review }: { review: AdminReview }) {
  const { t } = useTranslation('admin');
  const locale = useLocale();
  const confirm = useConfirm();
  const update = useUpdateReviewMutation();
  const remove = useDeleteReviewMutation();

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review.rating);
  const [text, setText] = useState(review.text);

  const date = new Date(review.createdAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'uk-UA');

  const save = () => {
    update.mutate(
      { id: review.id, dto: { rating, text: text.trim() } },
      { onSuccess: () => setEditing(false) },
    );
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: t('reviewsPage.confirmDelete.title'),
      message: t('reviewsPage.confirmDelete.message', { author: review.authorName }),
      confirmLabel: t('reviewsPage.confirmDelete.confirmLabel'),
      danger: true,
    });
    if (ok) remove.mutate(review.id);
  };

  return (
    <article className={styles.row} data-published={review.isPublished || undefined}>
      <div className={styles.meta}>
        <span className={styles.author}>{review.authorName}</span>
        <span className={styles.muted}>
          {date} ·{' '}
          <Link to="/admin/orders" className={styles.orderLink}>
            {t('reviewsPage.order', { id: review.orderId })}
          </Link>
        </span>
        {review.painting ? (
          <Link to={`/painting/${review.painting.id}`} className={styles.work}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cdnImage(review.painting.cardImage, 100)} alt="" />
            <span>{pickLocale(review.painting, 'title', locale)}</span>
          </Link>
        ) : null}
      </div>

      <div className={styles.body}>
        {editing ? (
          <>
            <StarRating value={rating} onChange={setRating} size={22} label={t('reviewsPage.rating')} />
            <textarea
              className={styles.textarea}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 1500))}
              rows={5}
            />
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={save} disabled={update.isPending || !text.trim()}>
                {t('reviewsPage.save')}
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => {
                  setEditing(false);
                  setRating(review.rating);
                  setText(review.text);
                }}
              >
                {t('reviewsPage.cancel')}
              </button>
            </div>
          </>
        ) : (
          <>
            <StarRating value={review.rating} size={16} />
            <p className={styles.text}>{review.text}</p>
          </>
        )}
      </div>

      <div className={styles.controls}>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={review.isPublished}
            disabled={update.isPending}
            onChange={(e) => update.mutate({ id: review.id, dto: { isPublished: e.target.checked } })}
          />
          <span className={styles.track} aria-hidden="true">
            <span className={styles.thumb} />
          </span>
          <span>{t('reviewsPage.show')}</span>
        </label>

        {!editing ? (
          <button type="button" className={styles.secondary} onClick={() => setEditing(true)}>
            {t('reviewsPage.edit')}
          </button>
        ) : null}
        <button type="button" className={styles.danger} onClick={onDelete} disabled={remove.isPending}>
          {t('reviewsPage.delete')}
        </button>
      </div>
    </article>
  );
}
