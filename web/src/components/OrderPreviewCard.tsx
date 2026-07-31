import type { Order, OrderStatus } from '../types/order.types';
import styles from './OrderPreviewCard.module.scss';

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Очікує',
  CONFIRMED: 'Підтверджено',
  CANCELLED: 'Скасовано',
  COMPLETED: 'Виконано',
};

function statusClass(status: OrderStatus) {
  switch (status) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return `${styles.status} ${styles.statusConfirmed}`;
    case 'CANCELLED':
      return `${styles.status} ${styles.statusCancelled}`;
    default:
      return styles.status;
  }
}

type Props = {
  order: Order;
  onCancel?: () => void;
};

export default function OrderPreviewCard({ order, onCancel }: Props) {
  return (
    <div className={styles.order}>
      <div className={styles.orderHeader}>
        <span className={styles.orderNumber}>Замовлення №{order.id}</span>
        <span className={statusClass(order.status)}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      <p className={styles.date}>
        {new Date(order.createdAt).toLocaleDateString('uk-UA')}
      </p>

      <div className={styles.thumbs}>
        {order.items.map((item) => (
          <img
            key={item.id}
            src={item.painting.cardImage}
            alt=""
            loading="lazy"
            decoding="async"
            className={styles.thumb}
          />
        ))}
      </div>

      <div className={styles.footer}>
        <span className={styles.footerLabel}>
          {order.items.length} {order.items.length === 1 ? 'робота' : 'роботи'}
        </span>
        <span className={styles.footerTotal}>
          {Number(order.total).toLocaleString()} ₴
        </span>
      </div>

      {onCancel && (order.status === 'PENDING' || order.status === 'CONFIRMED') && (
        <button onClick={onCancel} className={styles.cancelButton}>
          Скасувати замовлення
        </button>
      )}
    </div>
  );
}
