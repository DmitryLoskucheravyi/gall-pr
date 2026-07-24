import { useEffect, useState } from 'react';

import { ordersService } from '../../api/orders.api';
import type { Order, OrderStatus } from '../../types/order.types';
import { useAppDispatch } from '../../store/hooks';
import { showToast } from '../../store/slices/toastSlice';
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
  const dispatch = useAppDispatch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await ordersService.getAllOrders();
      setOrders(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    if (status === order.status) return;

    try {
      const updated = await ordersService.updateStatus(order.id, status);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      dispatch(showToast({ message: 'Статус оновлено' }));
    } catch (error: any) {
      dispatch(
        showToast({
          message:
            error?.response?.data?.message ?? 'Не вдалося змінити статус',
          variant: 'error',
        }),
      );
    }
  };

  const handleDelete = async (order: Order) => {
    if (!window.confirm(`Видалити замовлення №${order.id}?`)) return;

    try {
      await ordersService.deleteOrder(order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      dispatch(showToast({ message: 'Замовлення видалено' }));
    } catch (error: any) {
      dispatch(
        showToast({
          message:
            error?.response?.data?.message ??
            'Не вдалося видалити замовлення',
          variant: 'error',
        }),
      );
    }
  };

  if (loading) return <p className={styles.muted}>Завантаження…</p>;

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

              {order.user && (
                <p className={styles.userLine}>
                  {order.user.firstName} {order.user.lastName} ·{' '}
                  {order.user.email}
                </p>
              )}

              <p className={styles.date}>
                {new Date(order.createdAt).toLocaleDateString('uk-UA')}
              </p>

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
