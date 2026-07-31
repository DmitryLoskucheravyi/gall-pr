import { useMyOrders } from '../hooks/queries/useOrders';
import { useCancelOrderMutation } from '../hooks/mutations/useOrderMutations';
import type { Order } from '../types/order.types';
import Skeleton from '../components/ui/Skeleton';
import OrderPreviewCard from '../components/OrderPreviewCard';
import cardStyles from '../components/OrderPreviewCard.module.scss';
import styles from './OrdersPage.module.scss';

export default function OrdersPage() {
  const { data: orders = [], isLoading: loading } = useMyOrders();
  const cancelOrder = useCancelOrderMutation();

  const handleCancel = (order: Order) => {
    if (!window.confirm(`Скасувати замовлення №${order.id}?`)) return;
    cancelOrder.mutate(order.id);
  };

  if (loading) {
    return (
      <div>
        <h1 className={styles.title}>Мої замовлення</h1>
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={cardStyles.order}>
              <div className={cardStyles.orderHeader}>
                <Skeleton className={styles.skeletonNumber} />
                <Skeleton className={styles.skeletonStatus} />
              </div>
              <Skeleton className={styles.skeletonDate} />
              <div className={cardStyles.thumbs}>
                <Skeleton className={styles.skeletonThumb} />
                <Skeleton className={styles.skeletonThumb} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.title}>Мої замовлення</h1>

      {orders.length === 0 ? (
        <p className={styles.muted}>Замовлень поки немає</p>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => (
            <OrderPreviewCard
              key={order.id}
              order={order}
              onCancel={() => handleCancel(order)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
