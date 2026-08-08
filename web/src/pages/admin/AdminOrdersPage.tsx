import { useState } from 'react';

import { useAdminOrders } from '../../hooks/queries/useOrders';
import {
  useArchiveOrderMutation,
  useDeleteOrderMutation,
  useSendApologyMailMutation,
  useSendStatusMailMutation,
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
  SHIPPED: 'Відправлено',
  CANCELLED: 'Скасовано',
  COMPLETED: 'Виконано',
};

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
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

// Which statuses have a letter behind them. CONFIRMED lands minutes after the
// receipt and would only repeat it, so it has none — and the button says so
// instead of pretending otherwise.
const STATUS_MAIL_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: 'Надіслати лист про замовлення',
  SHIPPED: 'Надіслати лист про відправку',
  COMPLETED: 'Надіслати лист-подяку',
  CANCELLED: 'Надіслати лист про скасування',
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

type Tab = 'active' | 'completed';

export default function AdminOrdersPage() {
  const { data: orders = [], isLoading: loading } = useAdminOrders();
  const updateStatus = useUpdateOrderStatusMutation();
  // Which order is mid-shipping, and the waybill being typed for it.
  const [shippingOrderId, setShippingOrderId] = useState<number | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const updatePaymentStatus = useUpdatePaymentStatusMutation();
  const deleteOrder = useDeleteOrderMutation();
  const archiveOrder = useArchiveOrderMutation();
  const sendStatusMail = useSendStatusMailMutation();
  const sendApologyMail = useSendApologyMailMutation();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('active');

  const activeOrders = orders.filter((order) => !order.isArchived);
  const completedOrders = orders.filter((order) => order.status === 'COMPLETED');
  const visibleOrders = tab === 'active' ? activeOrders : completedOrders;

  const handleStatusChange = (order: Order, status: OrderStatus) => {
    if (status === order.status) return;

    // Marking an order shipped opens the waybill field instead of sending it
    // straight through: the customer's email is built around that number, and
    // the backend refuses the transition without one.
    if (status === 'SHIPPED') {
      setShippingOrderId(order.id);
      setTrackingInput(order.trackingNumber ?? '');
      return;
    }

    updateStatus.mutate({ id: order.id, status });
  };

  const handleShipConfirm = (order: Order) => {
    const trackingNumber = trackingInput.trim();
    if (!trackingNumber) return;

    updateStatus.mutate(
      { id: order.id, status: 'SHIPPED', trackingNumber },
      { onSuccess: () => setShippingOrderId(null) },
    );
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

  const recipientOf = (order: Order) =>
    order.user?.email ?? order.guestEmail ?? null;

  const handleSendStatusMail = async (order: Order) => {
    const ok = await confirm({
      title: STATUS_MAIL_LABEL[order.status] ?? 'Надіслати лист?',
      message: `Лист про поточний статус піде на ${recipientOf(order)}. Якщо такий лист уже надсилали, клієнт отримає його вдруге.`,
      confirmLabel: 'Надіслати',
    });
    if (!ok) return;
    sendStatusMail.mutate(order.id);
  };

  const handleSendApologyMail = async (order: Order) => {
    const ok = await confirm({
      title: `Надіслати лист-вибачення до №${order.id}?`,
      message: `На ${recipientOf(order)} піде лист: сталася помилка, ми розбираємось і скоро звʼяжемось. Деталей у ньому немає — розкажете їх самі.`,
      confirmLabel: 'Надіслати',
    });
    if (!ok) return;
    sendApologyMail.mutate(order.id);
  };

  const handleArchive = async (order: Order) => {
    const ok = await confirm({
      title: `Прибрати замовлення №${order.id} з перегляду?`,
      message:
        'Воно зникне зі списку активних, але залишиться доступним у вкладці "Виконані".',
      confirmLabel: 'Прибрати з перегляду',
    });
    if (!ok) return;
    archiveOrder.mutate(order.id);
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

      <div className={styles.tabs}>
        <button
          type="button"
          onClick={() => setTab('active')}
          className={tab === 'active' ? styles.tabActive : styles.tab}
        >
          Активні ({activeOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('completed')}
          className={tab === 'completed' ? styles.tabActive : styles.tab}
        >
          Виконані ({completedOrders.length})
        </button>
      </div>

      {orders.length === 0 ? (
        <p className={styles.muted}>Замовлень поки немає</p>
      ) : visibleOrders.length === 0 ? (
        <p className={styles.muted}>
          {tab === 'active' ? 'Активних замовлень немає' : 'Виконаних замовлень немає'}
        </p>
      ) : (
        <div className={styles.list}>
          {visibleOrders.map((order) => {
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

                {shippingOrderId === order.id && (
                  <div className={styles.trackingRow}>
                    <input
                      value={trackingInput}
                      onChange={(event) => setTrackingInput(event.target.value)}
                      placeholder="Номер накладної (ТТН)"
                      autoFocus
                      className={styles.trackingInput}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleShipConfirm(order);
                        if (event.key === 'Escape') setShippingOrderId(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleShipConfirm(order)}
                      disabled={!trackingInput.trim() || updateStatus.isPending}
                      className={styles.trackingConfirm}
                    >
                      Відправлено
                    </button>
                    <button
                      type="button"
                      onClick={() => setShippingOrderId(null)}
                      className={styles.trackingCancel}
                    >
                      Скасувати
                    </button>
                  </div>
                )}

                {order.trackingNumber && shippingOrderId !== order.id && (
                  <p className={styles.trackingLine}>
                    ТТН: <strong>{order.trackingNumber}</strong>
                  </p>
                )}

                {/* Letters are sent automatically once per status, so this row
                    is what re-sends one — after a corrected waybill, or when
                    the customer says nothing arrived. */}
                <div className={styles.mailRow}>
                  {recipientOf(order) ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSendStatusMail(order)}
                        disabled={
                          !STATUS_MAIL_LABEL[order.status] || sendStatusMail.isPending
                        }
                        title={
                          STATUS_MAIL_LABEL[order.status]
                            ? undefined
                            : 'Для цього статусу листа не передбачено'
                        }
                        className={styles.mailButton}
                      >
                        {STATUS_MAIL_LABEL[order.status] ?? 'Листа для статусу немає'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendApologyMail(order)}
                        disabled={sendApologyMail.isPending}
                        className={styles.apologyButton}
                      >
                        Лист-вибачення
                      </button>
                    </>
                  ) : (
                    <span className={styles.mailMuted}>
                      Немає email — листи цьому замовленню не надсилаються
                    </span>
                  )}
                </div>

                {order.status === 'CANCELLED' && (
                  <button
                    onClick={() => handleDelete(order)}
                    className={styles.deleteButton}
                  >
                    Видалити замовлення
                  </button>
                )}

                {order.status === 'COMPLETED' && !order.isArchived && (
                  <button
                    onClick={() => handleArchive(order)}
                    className={styles.archiveButton}
                  >
                    Прибрати з перегляду
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
