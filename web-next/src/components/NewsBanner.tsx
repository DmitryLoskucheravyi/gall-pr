import type { News } from '../types/news.types';
import { useLocale } from '../hooks/useLocale';
import { pickLocale } from '../utils/localizedField';
import styles from './NewsBanner.module.scss';

export function NewsBannerSkeleton() {
  return <div className={styles.skeleton} />;
}

export default function NewsBanner({ news }: { news: News }) {
  const locale = useLocale();

  return (
    <article className={styles.banner}>
      <h2 className={styles.title}>{pickLocale(news, 'title', locale)}</h2>
      <p className={styles.text}>{pickLocale(news, 'text', locale)}</p>
    </article>
  );
}
