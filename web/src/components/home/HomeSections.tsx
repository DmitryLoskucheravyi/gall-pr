'use client';

import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from '../ui/LocalizedLink';
import Reveal from '../ui/Reveal';
import { useInView } from '../../hooks/useInView';
import styles from './HomeSections.module.scss';

// The homepage's prose: how buying works, and where to go next. Every claim
// here is one the rest of the site already makes and keeps — Nova Poshta, cash
// on delivery, ordering without an account, Telegram updates — so this page can
// never promise what checkout won't do.

const STEPS = ['choose', 'order', 'pay', 'receive'] as const;

export function HomeHowToBuy() {
  const { t } = useTranslation('home');
  // One trigger for the whole row: the line is drawn through all four steps
  // in one stroke, so they must share a moment to start from.
  const { ref, inView } = useInView<HTMLOListElement>();

  return (
    <section className={styles.steps} aria-labelledby="how-to-buy">
      <Reveal>
        <p className={styles.kicker}>{t('howToBuy.kicker')}</p>
        <h2 id="how-to-buy" className={styles.heading}>
          {t('howToBuy.title')}
        </h2>
      </Reveal>

      <ol ref={ref} className={styles.stepList} data-shown={inView || undefined}>
        {STEPS.map((step, index) => (
          <li
            key={step}
            className={styles.step}
            style={{ '--i': index } as CSSProperties}
          >
            {/* Numeral and rule: a timeline read left to right. Decorative —
                the <ol> already counts for assistive tech. */}
            <div className={styles.stepHead} aria-hidden="true">
              <span className={styles.stepNumber}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className={styles.stepRule} />
            </div>
            <h3 className={styles.stepTitle}>{t(`howToBuy.steps.${step}.title`)}</h3>
            <p className={styles.stepText}>{t(`howToBuy.steps.${step}.text`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function HomeClosing() {
  const { t } = useTranslation('home');

  return (
    <Reveal as="section" className={styles.closing}>
      <h2 className={styles.closingTitle}>{t('closing.title')}</h2>
      <p className={styles.closingText}>{t('closing.text')}</p>
      {/* The hero's pair of links, on the band: uppercase, spaced, the
          outward arrow on the first, a hairline over both. */}
      <div className={styles.closingActions}>
        <Link to="/catalog" className={styles.primary}>
          {t('closing.catalog')}
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M8 16 16 8M9.5 8H16v6.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <Link to="/support" className={styles.secondary}>
          {t('closing.support')}
        </Link>
      </div>
    </Reveal>
  );
}
