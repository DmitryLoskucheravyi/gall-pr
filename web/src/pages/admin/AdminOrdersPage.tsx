import { useAdminOrders } from '../../hooks/queries/useOrders';
import {
  useDeleteOrderMutation,
  useUpdateOrderStatusMutation,
  useUpdatePaymentStatusMutation,
} from '../../hooks/mutations/useOrderMutations';
import type {
  DeliveryMethod,
  Order,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from '../../types/order.types';
import Skeleton from '../../components/ui/Skeleton';
import { useConfirm } from '../../components/ui/ConfirmDialog';
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

const PAYMENT_PROVIDER_LABEL: Record<PaymentProvider, string> = {
  LIQPAY: 'LiqPay',
  WAYFORPAY: 'WayForPay',
  CASH_ON_DELIVERY: 'Оплата при отриманні',
  CARD_TRANSFER: 'Переказ на карту',
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Очікує оплати',
  PAID: 'Оплачено',
  FAILED: 'Помилка оплати',
};

const DELIVERY_METHOD_LABEL: Record<DeliveryMethod, string> = {
  NOVA_POSHTA: 'Нова пошта',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminOrdersPage() {
  const { data: orders = [], isLoading: loading } = useAdminOrders();
  const updateStatus = useUpdateOrderStatusMutation();
  const updatePaymentStatus = useUpdatePaymentStatusMutation();
  const deleteOrder = useDeleteOrderMutation();
  const confirm = useConfirm();

  const handleStatusChange = (order: Order, status: OrderStatus) => {
    if (status === order.status) return;
    updateStatus.mutate({ id: order.id, status });
  };

  const handleTogglePaymentStatus = (order: Order) => {
    const next: PaymentStatus = order.paymentStatus === 'PAID' ? 'PENDING' : 'PAID';
    updatePaymentStatus.mutate({ id: order.id, paymentStatus: next });
  };

  const handleDelete = async (order: Order) => {
    const ok = await confirm({
      title: `Видалити замовлення №${order.id}?`,
      message: 'Замовлення буде видалено назавжди.',
      confirmLabel: 'Видалити',
      danger: true,
    });
    if (!ok) return;
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
          {orders.map((order) => {
            const deliveryCost = Number(order.deliveryCost);
            const codFee = Number(order.codFee);
            const itemsSubtotal = order.items.reduce(
              (sum, item) => sum + Number(item.price) * item.quantity,
              0,
            );

            return (
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

                <p className={styles.date}>{formatDateTime(order.createdAt)}</p>

                <div className={styles.detailsGrid}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Оплата</span>
                    <span>{PAYMENT_PROVIDER_LABEL[order.paymentProvider]}</span>
                  </div>

                  {order.paymentProvider !== 'CASH_ON_DELIVERY' && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Статус оплати</span>
                      <span className={styles.paymentStatusControl}>
                        <span
                          className={
                            order.paymentStatus === 'PAID'
                              ? styles.paymentStatusPaid
                              : styles.paymentStatusPending
                          }
                        >
                          {PAYMENT_STATUS_LABEL[order.paymentStatus]}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTogglePaymentStatus(order)}
                          className={styles.paymentStatusButton}
                        >
                          {order.paymentStatus === 'PAID'
                            ? 'Скасувати позначку'
                            : 'Позначити оплаченим'}
                        </button>
                        {order.paymentProofUrl && (
                          <a
                            href={order.paymentProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.paymentProofLink}
                          >
                            Скрін оплати
                          </a>
                        )}
                      </span>
                    </div>
                  )}

                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Доставка</span>
                    <span>
                      {DELIVERY_METHOD_LABEL[order.deliveryMethod]}
                      {order.novaPoshtaCity && `, ${order.novaPoshtaCity}`}
                      {order.novaPoshtaWarehouse && ` — ${order.novaPoshtaWarehouse}`}
                    </span>
                  </div>

                  {order.callMeRequested && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Зв'язок</span>
                      <span>Просив(ла) зателефонувати</span>
                    </div>
                  )}

                  {(deliveryCost > 0 || codFee > 0) && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Розбивка суми</span>
                      <span>
                        Товари: {itemsSubtotal.toLocaleString()} ₴
                        {deliveryCost > 0 &&
                          ` + Доставка: ${deliveryCost.toLocaleString()} ₴`}
                        {codFee > 0 &&
                          ` + Комісія за накладений платіж: ${codFee.toLocaleString()} ₴`}
                      </span>
                    </div>
                  )}
                </div>

                <ul className={styles.itemsList}>
                  {order.items.map((item) => (
                    <li key={item.id} className={styles.itemRow}>
                      <span className={styles.itemTitle}>
                        {item.painting?.title ?? `Картина №${item.paintingId}`}
                      </span>
                      <span className={styles.itemPrice}>
                        {item.quantity} × {Number(item.price).toLocaleString()} ₴
                      </span>
                    </li>
                  ))}
                </ul>

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
            );
          })}
        </div>
      )}
    </div>
  );
}
