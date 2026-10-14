'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Reveal from '../ui/Reveal';
import Slider from '../ui/Slider';
import StarRating from '../ui/StarRating';
import { LocalizedLink as Link } from '../ui/LocalizedLink';
import { usePublicReviews } from '../../hooks/queries/useReviews';
import { useLocale } from '../../hooks/useLocale';
import { cdnImage } from '../../utils/imageUrl';
import { pickLocale } from '../../utils/localizedField';
import type { PublicReview } from '../../types/review.types';
import styles from './HomeReviews.module.scss';

// What buyers said, under "how to buy": the reassurance comes right after the
// instructions. Only reviews the admin has published, written by people whose
// order actually reached them — the server allows nothing else.
//
// With nothing published the section is not drawn at all: an empty "reviews"
// heading says the opposite of what it is for.

export default function HomeReviews() {
  const { t } = useTranslation('home');
  const { data: reviews = [] } = usePublicReviews();

  if (reviews.length === 0) return null;

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section className={styles.section} aria-labelledby="reviews-title">
      <Reveal className={styles.head}>
        <div>
          <p className={styles.kicker}>{t('reviews.kicker')}</p>
          <h2 id="reviews-title" className={styles.heading}>
            {t('reviews.title')}
          </h2>
        </div>
        <div className={styles.summary}>
          <span className={styles.average}>{average.toFixed(1)}</span>
          <StarRating value={Math.round(average)} size={16} />
          <span className={styles.count}>{t('reviews.count', { count: reviews.length })}</span>
        </div>
      </Reveal>

      <Slider className={styles.slider} label={t('reviews.title')}>
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </Slider>
    </section>
  );
}

function ReviewCard({ review }: { review: PublicReview }) {
  const { t } = useTranslation('home');
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const long = review.text.length > 260;
  const date = new Date(review.createdAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'uk-UA', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <article className={styles.card}>
      {/* A large opening quote, drawn in the same hairline as the step
          numerals — the card's watermark. */}
      <span className={styles.quote} aria-hidden="true">
        “
      </span>

      <StarRating value={review.rating} size={16} />

      <p className={styles.text} data-expanded={expanded || undefined}>
        {review.text}
      </p>
      {long ? (
        <button type="button" className={styles.more} onClick={() => setExpanded((e) => !e)}>
          {expanded ? t('reviews.less') : t('reviews.more')}
        </button>
      ) : null}

      <footer className={styles.footer}>
        <div>
          <span className={styles.author}>{review.authorName}</span>
          <span className={styles.date}>{date}</span>
        </div>
        {review.painting ? (
          <Link to={`/painting/${review.painting.id}`} className={styles.work} title={pickLocale(review.painting, 'title', locale)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cdnImage(review.painting.cardImage, 120)} alt="" loading="lazy" />
            <span>{pickLocale(review.painting, 'title', locale)}</span>
          </Link>
        ) : null}
      </footer>
    </article>
  );
}
