import Skeleton from './ui/Skeleton';
import styles from './GalleryCardSkeleton.module.scss';

export default function GalleryCardSkeleton() {
  return <Skeleton className={styles.image} />;
}
