import { Link } from 'react-router-dom';

import { useFaq, useFaqEntries } from '../hooks/queries/useFaq';
import Skeleton from '../components/ui/Skeleton';
import FaqAccordion from '../components/ui/FaqAccordion';
import styles from './FaqPage.module.scss';

export default function FaqPage() {
  const { isLoading: loading } = useFaq();
  const entries = useFaqEntries();

  return (
    <div>
      <h1 className={styles.title}>Підтримка</h1>

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
    </div>
  );
}
