import { useAdminOrders } from '../../hooks/queries/useOrders';
import {
  useDeleteOrderMutation,
  useUpdateOrderStatusMutation,
} from '../../hooks/mutations/useOrderMutations';
import type { Order, OrderStatus } from '../../types/order.types';
import Skeleton from '../../components/ui/Skeleton';
import styles from './AdminOrdersPage.module.scss';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Очікує',
  CONFIRMED: 'Підтверджено',
  CANCELLED: 'Скасовано',
  COMPLETED: 'Виконано',
};

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
];

export default function AdminOrdersPage() {
  const { data: orders = [], isLoading: loading } = useAdminOrders();
  const updateStatus = useUpdateOrderStatusMutation();
  const deleteOrder = useDeleteOrderMutation();

  const handleStatusChange = (order: Order, status: OrderStatus) => {
    if (status === order.status) return;
    updateStatus.mutate({ id: order.id, status });
  };

  const handleDelete = (order: Order) => {
    if (!window.confirm(`Видалити замовлення №${order.id}?`)) return;
    deleteOrder.mutate(order.id);
  };

  if (loading) {
    return (
      <div>
        <h1 className={styles.title}>Замовлення</h1>
        <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={styles.order}>
              <div className={styles.orderHeader}>
                <Skeleton className={styles.skeletonNumber} />
                <Skeleton className={styles.skeletonTotal} />
              </div>
              <Skeleton className={styles.skeletonUserLine} />
              <Skeleton className={styles.skeletonDate} />
              <div className={styles.statusOptions}>
                {Array.from({ length: 4 }).map((__, statusIndex) => (
                  <Skeleton
                    key={statusIndex}
                    className={styles.skeletonStatusOption}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.title}>Замовлення</h1>

      {orders.length === 0 ? (
        <p className={styles.muted}>Замовлень поки немає</p>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => (
            <div key={order.id} className={styles.order}>
              <div className={styles.orderHeader}>
                <span className={styles.orderNumber}>
                  Замовлення №{order.id}
                </span>
                <span className={styles.orderTotal}>
                  {Number(order.total).toLocaleString()} ₴
                </span>
              </div>

              {order.user ? (
                <p className={styles.userLine}>
                  {order.user.firstName} {order.user.lastName} ·{' '}
                  {order.user.email}
                </p>
              ) : (
                order.guestName && (
                  <p className={styles.guestLine}>
                    {order.guestName} · {order.guestPhone}
                    {order.guestEmail ? ` · ${order.guestEmail}` : ''}
                    {' · '}
                    <span className={styles.guestBadge}>Гість</span>
                    {order.guestAddress && (
                      <>
                        <br />
                        {order.guestAddress}
                      </>
                    )}
                  </p>
                )
              )}

              <p className={styles.date}>
                {new Date(order.createdAt).toLocaleDateString('uk-UA')}
              </p>

              {order.comment && (
                <p className={styles.comment}>
                  <span className={styles.commentLabel}>Коментар:</span>{' '}
                  {order.comment}
                </p>
              )}

              <div className={styles.statusOptions}>
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(order, status)}
                    className={
                      order.status === status
                        ? styles.statusOptionActive
                        : styles.statusOption
                    }
                  >
                    {STATUS_LABEL[status]}
                  </button>
                ))}
              </div>

              {order.status === 'CANCELLED' && (
                <button
                  onClick={() => handleDelete(order)}
                  className={styles.deleteButton}
                >
                  Видалити замовлення
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
