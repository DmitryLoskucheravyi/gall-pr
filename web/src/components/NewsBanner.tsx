import type { News } from '../types/news.types';
import styles from './NewsBanner.module.scss';

export function NewsBannerSkeleton() {
  return <div className={styles.skeleton} />;
}

export default function NewsBanner({ news }: { news: News }) {
  return (
    <article className={styles.banner}>
      <h2 className={styles.title}>{news.title}</h2>
      <p className={styles.text}>{news.text}</p>
    </article>
  );
}
