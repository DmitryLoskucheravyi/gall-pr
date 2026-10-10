'use client';

import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from '../ui/LocalizedLink';
import Reveal from '../ui/Reveal';
import styles from './HomeSections.module.scss';

// The homepage's prose: what the gallery is, how buying works, and where to go
// next. Every claim here is one the rest of the site already makes and keeps —
// unique works, Nova Poshta, cash on delivery, ordering without an account,
// Telegram updates — so this page can never promise what checkout won't do.

export function HomeAbout({ available }: { available: number | null }) {
  const { t } = useTranslation('home');

  const stats = [
    { value: available !== null ? String(available) : '—', label: t('about.stats.available') },
    { value: '1', label: t('about.stats.unique') },
    { value: t('about.stats.deliveryValue'), label: t('about.stats.delivery') },
  ];

  return (
    <Reveal as="section" className={styles.about}>
      <div className={styles.aboutText}>
        <p className={styles.kicker}>{t('about.kicker')}</p>
        <h2 className={styles.heading}>{t('about.title')}</h2>
        <p className={styles.body}>{t('about.text1')}</p>
        <p className={styles.body}>{t('about.text2')}</p>
      </div>

      <dl className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <dt className={styles.statLabel}>{stat.label}</dt>
            <dd className={styles.statValue}>{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}

const STEPS = ['choose', 'order', 'pay', 'receive'] as const;

export function HomeHowToBuy() {
  const { t } = useTranslation('home');

  return (
    <section className={styles.steps} aria-labelledby="how-to-buy">
      <Reveal>
        <p className={styles.kicker}>{t('howToBuy.kicker')}</p>
        <h2 id="how-to-buy" className={styles.heading}>
          {t('howToBuy.title')}
        </h2>
      </Reveal>

      <ol className={styles.stepList}>
        {STEPS.map((step, index) => (
          <Reveal as="li" key={step} className={styles.step} delay={index * 90}>
            <span className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</span>
            <h3 className={styles.stepTitle}>{t(`howToBuy.steps.${step}.title`)}</h3>
            <p className={styles.stepText}>{t(`howToBuy.steps.${step}.text`)}</p>
          </Reveal>
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
      <div className={styles.closingActions}>
        <Link to="/catalog" className={styles.primary}>
          {t('closing.catalog')}
        </Link>
        <Link to="/support" className={styles.secondary}>
          {t('closing.support')}
        </Link>
      </div>
    </Reveal>
  );
}
