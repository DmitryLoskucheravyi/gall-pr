import { Link } from 'react-router-dom';

import type { Painting } from '../types/painting.types';
import { useAppSelector } from '../store/hooks';
import styles from './PaintingCard.module.scss';

type Props = {
  painting: Painting;
  onBuy?: () => void;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
};

export default function PaintingCard({
  painting,
  onBuy,
  isAdmin,
  onEdit,
  onDelete,
  compact,
}: Props) {
  const authorName = useAppSelector((state) => state.settings.authorName);
  const price = Number(painting.price);

  return (
    <div className={styles.card}>
      <Link to={`/painting/${painting.id}`}>
        <img
          src={painting.cardImage}
          alt={painting.title}
          className={styles.image}
        />
      </Link>

      <div className={styles.body}>
        <Link to={`/painting/${painting.id}`} className={styles.title}>
          {painting.title}
        </Link>

        {!!authorName && <span className={styles.author}>{authorName}</span>}

        {!compact && painting.width && painting.height && (
          <span className={styles.size}>
            {painting.width} × {painting.height} см
          </span>
        )}

        <span className={styles.price}>{price.toLocaleString()} ₴</span>

        {!compact && (
          <div className={styles.actions}>
            <Link to={`/painting/${painting.id}`} className={styles.detailsButton}>
              Детальніше
            </Link>
            <button onClick={onBuy} className={styles.buyButton}>
              Купити
            </button>
          </div>
        )}

        {isAdmin && !compact && (
          <div className={styles.adminActions}>
            <button onClick={onEdit} className={styles.editButton}>
              Редагувати
            </button>
            <button onClick={onDelete} className={styles.deleteButton}>
              Видалити
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
