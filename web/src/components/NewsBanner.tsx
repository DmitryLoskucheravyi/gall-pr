import type { News } from '../types/news.types';
import styles from './NewsBanner.module.scss';

export function NewsBannerSkeleton() {
  return <div className={styles.skeleton} />;
}

export default function NewsBanner({ news }: { news: News }) {
  return (
    <div className={styles.banner}>
      {news.imageUrl && (
        <div className={styles.imageWrap}>
          <img src={news.imageUrl} alt="" className={styles.image} />
        </div>
      )}

      <div className={styles.body}>
        <h2 className={styles.title}>{news.title}</h2>
        <p className={styles.text}>{news.text}</p>
      </div>
    </div>
  );
}
