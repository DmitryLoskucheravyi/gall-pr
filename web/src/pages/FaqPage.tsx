import { Link } from 'react-router-dom';

import { useFaq, useFaqEntries } from '../hooks/queries/useFaq';
import { useSupportTelegramUrl } from '../hooks/queries/useSettings';
import Skeleton from '../components/ui/Skeleton';
import FaqAccordion from '../components/ui/FaqAccordion';
import { usePageMeta } from '../hooks/usePageMeta';
import styles from './FaqPage.module.scss';

export default function FaqPage() {
  usePageMeta(
    'Підтримка',
    'Поширені запитання про замовлення, оплату та доставку картин у галереї Viktorumm.',
  );

  const { isLoading: loading } = useFaq();
  const entries = useFaqEntries();
  const supportTelegramUrl = useSupportTelegramUrl();

  return (
    <div>
      <h1 className={styles.title}>Підтримка</h1>

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
            <p className={styles.chatCtaText}>Це вам не допомогло?</p>
            <Link to="/support/chat" className={styles.chatCtaButton}>
              Чат з нами
            </Link>
          </div>
        </div>

        {supportTelegramUrl && (
          <aside className={styles.botInfo}>
            <h2 className={styles.botInfoTitle}>Бот у Telegram</h2>
            <p className={styles.botInfoHint}>
              Отримуйте сповіщення про статус замовлень і оплату прямо в
              Telegram, а не лише на сайті.
            </p>

            <ol className={styles.botInfoSteps}>
              <li>
                Перейдіть за{' '}
                <a href={supportTelegramUrl} target="_blank" rel="noreferrer">
                  посиланням на бота
                </a>{' '}
                і натисніть Start
              </li>
              <li>
                Введіть код, який надішле бот, у профілі на сайті — так бот
                звʼяжеться з вашим акаунтом
              </li>
              <li>
                Команда <code>/support</code> — щоб написати нам прямо з
                Telegram
              </li>
            </ol>
          </aside>
        )}
      </div>
    </div>
  );
}
