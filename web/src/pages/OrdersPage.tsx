import { useEffect, useState } from 'react';

import { ordersService } from '../api/orders.api';
import type { Order, OrderStatus } from '../types/order.types';
import { useAppDispatch } from '../store/hooks';
import { showToast } from '../store/slices/toastSlice';
import Skeleton from '../components/ui/Skeleton';
import styles from './OrdersPage.module.scss';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Очікує',
  CONFIRMED: 'Підтверджено',
  CANCELLED: 'Скасовано',
  COMPLETED: 'Виконано',
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING: styles.status,
  CONFIRMED: `${styles.status} ${styles.statusConfirmed}`,
  CANCELLED: `${styles.status} ${styles.statusCancelled}`,
  COMPLETED: `${styles.status} ${styles.statusCompleted}`,
};

export default function OrdersPage() {
  const dispatch = useAppDispatch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersService
      .getOrders()
      .then(setOrders)
      .catch((error) => console.log(error))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (order: Order) => {
    if (!window.confirm(`Скасувати замовлення №${order.id}?`)) return;

    try {
      const updated = await ordersService.cancelOrder(order.id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      dispatch(showToast({ message: 'Замовлення скасовано' }));
    } catch (error: any) {
      dispatch(
        showToast({
          message:
            error?.response?.data?.message ??
            'Не вдалося скасувати замовлення',
          variant: 'error',
        }),
      );
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className={styles.title}>Мої замовлення</h1>
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={styles.order}>
              <div className={styles.orderHeader}>
                <Skeleton className={styles.skeletonNumber} />
                <Skeleton className={styles.skeletonStatus} />
              </div>
              <Skeleton className={styles.skeletonDate} />
              <div className={styles.thumbs}>
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
            <div key={order.id} className={styles.order}>
              <div className={styles.orderHeader}>
                <span className={styles.orderNumber}>
                  Замовлення №{order.id}
                </span>
                <span className={STATUS_CLASS[order.status]}>
                  {STATUS_LABEL[order.status]}
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
                    className={styles.thumb}
                  />
                ))}
              </div>

              <div className={styles.footer}>
                <span className={styles.footerLabel}>
                  {order.items.length}{' '}
                  {order.items.length === 1 ? 'робота' : 'роботи'}
                </span>
                <span className={styles.footerTotal}>
                  {Number(order.total).toLocaleString()} ₴
                </span>
              </div>

              {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                <button
                  onClick={() => handleCancel(order)}
                  className={styles.cancelButton}
                >
                  Скасувати замовлення
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
