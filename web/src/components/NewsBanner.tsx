'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { News } from '../types/news.types';
import { useLocale, type Locale } from '../hooks/useLocale';
import { pickLocale } from '../utils/localizedField';
import { cdnImage } from '../utils/imageUrl';
import Slider from './ui/Slider';
import styles from './NewsBanner.module.scss';

// The news as a playbill across the page rather than a notice on it: a band in
// the gallery's own green, the date set as big as the headline, and the entry
// itself held between them.
//
// It is the first thing under the hero, so it had to survive two things the
// old banner never had to. It has to look like something with one entry and
// no photograph — which is exactly what the gallery has today — and it has to
// hold the eye of someone who has just come off a full-screen video.
//
// Hence the date. It is the one thing every entry has, it is typographically
// the most interesting thing available, and at this size it does the work a
// photograph would otherwise have to: the band reads as designed before a word
// of it is read.
//
// With more than one entry the band turns itself over, with the strip along
// the bottom showing which one is up and how long is left. There is no news
// page to send anyone to, so the strip swaps the entry in place.
//
// The bar is the clock, not a picture of one: the band turns when the current
// tab's fill finishes its animation, and not on a timer of its own. Two clocks
// drift — a timer restarted after a pause ran a fresh nine seconds while the
// bar resumed from where it stopped, so the bar sat full for seconds before
// anything happened. With one clock, everything that pauses the bar (a resting
// pointer, keyboard focus — see .fill in the stylesheet) pauses the turn too,
// and a reduced-motion visitor, who gets no animation, gets no turning.

// The feature photo is at most a third of a full-bleed band wide.
const MEDIA_WIDTH = 900;

// Below this many photos an entry's gallery stays off the homepage: two
// pictures in a slider is a slider with nothing to slide.
const GALLERY_MIN = 3;
// Each slide is at most half the left column wide.
const GALLERY_WIDTH = 640;

type DateParts = { day: string; month: string; year: string; iso: string; full: string };

function dateParts(iso: string, locale: Locale): DateParts {
  const date = new Date(iso);
  // An unparseable date would otherwise throw out of toISOString() and take
  // the whole homepage with it.
  if (Number.isNaN(date.getTime())) {
    return { day: '', month: '', year: '', iso: '', full: '' };
  }

  const tag = locale === 'en' ? 'en-GB' : 'uk-UA';
  return {
    day: date.toLocaleDateString(tag, { day: '2-digit' }),
    // Ukrainian abbreviates with a trailing dot ("жовт."), which under a
    // numeral this size reads as a typo rather than as an abbreviation.
    month: date.toLocaleDateString(tag, { month: 'long' }).replace(/\.$/, ''),
    year: date.toLocaleDateString(tag, { year: 'numeric' }),
    iso: date.toISOString().slice(0, 10),
    full: date.toLocaleDateString(tag, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  };
}

function shortDate(iso: string, locale: Locale) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale === 'en' ? 'en-GB' : 'uk-UA', {
    day: '2-digit',
    month: 'short',
  });
}

export function NewsBannerSkeleton() {
  return (
    <div className={styles.band} aria-hidden="true">
      <div className={styles.inner}>
        <div className={styles.skeletonDate} />
        <div className={styles.skeletonCopy}>
          <span className={styles.skeletonLine} data-w="title" />
          <span className={styles.skeletonLine} />
          <span className={styles.skeletonLine} data-w="short" />
        </div>
      </div>
    </div>
  );
}

export default function NewsBanner({ items }: { items: News[] }) {
  const { t } = useTranslation('home');
  const locale = useLocale();

  // null means "whatever is newest", so a refetch that brings in a newer entry
  // still shows it until the reader picks one themselves.
  const [picked, setPicked] = useState<number | null>(null);

  const index = Math.max(
    0,
    items.findIndex((item) => item.id === picked),
  );
  const active = items[index];

  if (!active) return null;

  const date = dateParts(active.createdAt, locale);
  const photo = active.imageUrl;
  const gallery =
    active.gallery && active.gallery.length >= GALLERY_MIN ? active.gallery : null;

  return (
    <div
      className={styles.band}
      data-media={photo ? 'photo' : 'none'}
    >
      <div className={styles.inner}>
        {/* display: contents, so these three stay children of the grid while
            the key still remounts them together — which is what replays their
            entrance each time the band turns over. The strip below is left
            out of it deliberately: remounting it would drop the focus of
            anyone moving through it from the keyboard. */}
        <div className={styles.turn} key={active.id}>
          <time className={styles.date} dateTime={date.iso} aria-label={date.full}>
            <span className={styles.day} aria-hidden="true">
              {date.day}
            </span>
            <span className={styles.rest} aria-hidden="true">
              <span className={styles.month}>{date.month}</span>
              <span className={styles.year}>{date.year}</span>
            </span>
          </time>

          <div className={styles.copy}>
            <div className={styles.heading}>
              <p className={styles.kicker}>
                <span className={styles.pulse} aria-hidden="true" />
                {t('news.kicker')}
              </p>
              <h2 className={styles.title}>{pickLocale(active, 'title', locale)}</h2>

              {gallery ? (
                <Slider
                  className={styles.gallery}
                  label={t('news.galleryLabel', {
                    title: pickLocale(active, 'title', locale),
                  })}
                >
                  {gallery.map((url, index) => (
                    <figure key={url} className={styles.slide}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className={styles.slideImage}
                        src={cdnImage(url, GALLERY_WIDTH)}
                        alt={t('news.galleryPhoto', {
                          n: index + 1,
                          total: gallery.length,
                        })}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                    </figure>
                  ))}
                </Slider>
              ) : null}
            </div>
            <p className={styles.text}>{pickLocale(active, 'text', locale)}</p>
          </div>

          {photo ? (
            <figure className={styles.media}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.image}
                src={cdnImage(photo, MEDIA_WIDTH)}
                // The entry's title is right beside it; repeating it here
                // would only make a screen reader say it twice.
                alt=""
                loading="lazy"
                decoding="async"
              />
            </figure>
          ) : null}
        </div>

        {items.length > 1 ? (
          <nav className={styles.strip} aria-label={t('news.indexLabel')}>
            {items.map((item, itemIndex) => {
              const current = itemIndex === index;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={styles.tab}
                  data-current={current || undefined}
                  aria-current={current ? 'true' : undefined}
                  onClick={() => setPicked(item.id)}
                >
                  {/* The bar is the clock: it fills over one turn of the
                      band, and holds full on the entry being read. */}
                  <span className={styles.bar} aria-hidden="true">
                    <span
                      className={styles.fill}
                      // Keyed by the entry so the fill restarts from empty
                      // every time this tab becomes the current one.
                      key={current ? `${item.id}-on` : `${item.id}-off`}
                      onAnimationEnd={
                        current
                          ? () => setPicked(items[(index + 1) % items.length].id)
                          : undefined
                      }
                    />
                  </span>
                  <span className={styles.tabDate}>
                    {shortDate(item.createdAt, locale)}
                  </span>
                  <span className={styles.tabTitle}>
                    {pickLocale(item, 'title', locale)}
                  </span>
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
