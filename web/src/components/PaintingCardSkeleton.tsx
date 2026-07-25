import Skeleton from './ui/Skeleton';
import styles from './PaintingCardSkeleton.module.scss';

type Props = {
  compact?: boolean;
};

export default function PaintingCardSkeleton({ compact }: Props) {
  return (
    <div className={styles.card}>
      <Skeleton className={styles.image} />

      <div className={styles.body}>
        <Skeleton className={styles.title} />
        {!compact && <Skeleton className={styles.author} />}
        <Skeleton className={styles.price} />

        {!compact && (
          <div className={styles.actions}>
            <Skeleton className={styles.button} />
            <Skeleton className={styles.button} />
          </div>
        )}
      </div>
    </div>
  );
}
