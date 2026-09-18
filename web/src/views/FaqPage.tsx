'use client';

import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from '../components/ui/LocalizedLink';
import { useFaq, useFaqEntries } from '../hooks/queries/useFaq';
import { useSupportTelegramUrl } from '../hooks/queries/useSettings';
import Skeleton from '../components/ui/Skeleton';
import FaqAccordion from '../components/ui/FaqAccordion';
import { safeExternalUrl } from '../utils/safeUrl';
import styles from './FaqPage.module.scss';

export default function FaqPage() {
  const { t } = useTranslation('faq');

  const { isLoading: loading } = useFaq();
  const entries = useFaqEntries();
  const supportTelegramUrl = useSupportTelegramUrl();

  return (
    <div>
      <h1 className={styles.title}>{t('pageTitle')}</h1>

      <div className={styles.layout}>
        <div className={styles.panel}>
          {loading ? (
            <div className={styles.skeletonList}>
              <Skeleton className={styles.skeletonItem} />
              <Skeleton className={styles.skeletonItem} />
              <Skeleton className={styles.skeletonItem} />
            </div>
          ) : (
            <FaqAccordion items={entries} />
          )}

          <div className={styles.chatCta}>
            <p className={styles.chatCtaText}>{t('notHelped')}</p>
            <Link to="/support/chat" className={styles.chatCtaButton}>
              {t('chatWithUs')}
            </Link>
          </div>
        </div>

        {supportTelegramUrl && (
          <aside className={styles.botInfo}>
            <h2 className={styles.botInfoTitle}>{t('telegramBot')}</h2>
            <p className={styles.botInfoHint}>{t('telegramHint')}</p>

            <ol className={styles.botInfoSteps}>
              <li>
                {t('steps.step1Before')}{' '}
                <a
                  href={safeExternalUrl(supportTelegramUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('steps.step1Link')}
                </a>{' '}
                {t('steps.step1After')}
              </li>
              <li>{t('steps.step2')}</li>
              <li>
                {t('steps.step3Before')} <code>/support</code> {t('steps.step3After')}
              </li>
            </ol>
          </aside>
        )}
      </div>
    </div>
  );
}
