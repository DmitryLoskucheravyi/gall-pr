import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAdminOrders } from '../../hooks/queries/useOrders';
import { useLocale } from '../../hooks/useLocale';
import {
  useArchiveOrderMutation,
  useDeleteOrderMutation,
  useSendApologyMailMutation,
  useSendStatusMailMutation,
  useUpdateOrderStatusMutation,
  useUpdatePaymentStatusMutation,
} from '../../hooks/mutations/useOrderMutations';
import type {
  AdminOrderTab,
  DeliveryMethod,
  Order,
  OrderStatus,
  PaymentStatus,
} from '../../types/order.types';
import Skeleton from '../../components/ui/Skeleton';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import styles from './AdminOrdersPage.module.scss';

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'CANCELLED',
  'COMPLETED',
];

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Kept as a re-export of the shared type so the tab, the query key and the
// query string can never drift apart.
type Tab = AdminOrderTab;

export default function AdminOrdersPage() {
  const { t } = useTranslation('admin');
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>('active');
  const [page, setPage] = useState(1);

  // Filtered and paged on the server. This page used to ask for every order
  // the shop had ever taken — with eager items and their paintings — and sort
  // it out in the browser, which is one query whose cost grows with the
  // business, on the screen its owner opens most often.
  const { data: ordersPage, isLoading: loading } = useAdminOrders(tab, page);

  const visibleOrders = ordersPage?.data ?? [];
  const totalPages = ordersPage?.totalPages ?? 1;
  const total = ordersPage?.total ?? 0;

  const switchTab = (next: Tab) => {
    setTab(next);
    // Page 3 of the active list is not page 3 of the completed one.
    setPage(1);
  };
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
      title: t('ordersPage.confirmDelete.title', { id: order.id }),
      message: t('ordersPage.confirmDelete.message'),
      confirmLabel: t('ordersPage.confirmDelete.confirmLabel'),
      danger: true,
    });
    if (!ok) return;
    deleteOrder.mutate(order.id);
  };

  const recipientOf = (order: Order) =>
    order.user?.email ?? order.guestEmail ?? null;

  const handleSendStatusMail = async (order: Order) => {
    const ok = await confirm({
      title: t(`ordersPage.statusMail.${order.status}`, {
        defaultValue: t('ordersPage.confirmStatusMail.title'),
      }),
      message: t('ordersPage.confirmStatusMail.message', {
        email: recipientOf(order),
      }),
      confirmLabel: t('ordersPage.confirmStatusMail.confirmLabel'),
    });
    if (!ok) return;
    sendStatusMail.mutate(order.id);
  };

  const handleSendApologyMail = async (order: Order) => {
    const ok = await confirm({
      title: t('ordersPage.confirmApologyMail.title', { id: order.id }),
      message: t('ordersPage.confirmApologyMail.message', {
        email: recipientOf(order),
      }),
      confirmLabel: t('ordersPage.confirmApologyMail.confirmLabel'),
    });
    if (!ok) return;
    sendApologyMail.mutate(order.id);
  };

  const handleArchive = async (order: Order) => {
    const ok = await confirm({
      title: t('ordersPage.confirmArchive.title', { id: order.id }),
      message: t('ordersPage.confirmArchive.message'),
      confirmLabel: t('ordersPage.confirmArchive.confirmLabel'),
    });
    if (!ok) return;
    archiveOrder.mutate(order.id);
  };

  const statusMailLabel = (status: OrderStatus): string | undefined => {
    const exists = ['PENDING', 'SHIPPED', 'COMPLETED', 'CANCELLED'].includes(status);
    return exists ? t(`ordersPage.statusMail.${status}`) : undefined;
  };

  if (loading) {
    return (
      <div>
        <h1 className={styles.title}>{t('ordersPage.title')}</h1>
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
      <h1 className={styles.title}>{t('ordersPage.title')}</h1>

      <div className={styles.tabs}>
        <button
          type="button"
          onClick={() => switchTab('active')}
          className={tab === 'active' ? styles.tabActive : styles.tab}
        >
          {t('ordersPage.tabs.active', {
            count: tab === 'active' ? total : 0,
          })}
        </button>
        <button
          type="button"
          onClick={() => switchTab('completed')}
          className={tab === 'completed' ? styles.tabActive : styles.tab}
        >
          {t('ordersPage.tabs.completed', {
            count: tab === 'completed' ? total : 0,
          })}
        </button>
      </div>

      {visibleOrders.length === 0 ? (
        <p className={styles.muted}>
          {tab === 'active'
            ? t('ordersPage.emptyActive')
            : t('ordersPage.emptyCompleted')}
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
                    {/* A commission needs telling apart at a glance: nothing
                        has left stock, nothing is owed yet, and the first move
                        is the artist's. Reading it as an ordinary sale would
                        be the wrong response entirely. */}
                    {order.isCommission
                      ? t('ordersPage.commission')
                      : t('ordersPage.order')}{' '}
                    №{order.id}
                    {order.isCommission && (
                      <span className={styles.commissionTag}>
                        {t('ordersPage.commissionTag')}
                      </span>
                    )}
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
                      {/* Often the one they actually want writing to, so it
                          sits with the rest of the contacts rather than
                          buried in the comment. */}
                      {order.contactHandle ? ` · ${order.contactHandle}` : ''}
                      {' · '}
                      <span className={styles.guestBadge}>
                        {t('ordersPage.guestBadge')}
                      </span>
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
                  {formatDateTime(order.createdAt, locale)}
                </p>

                <div className={styles.detailsGrid}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>
                      {t('ordersPage.payment')}
                    </span>
                    <span>
                      {t(`ordersPage.paymentProvider.${order.paymentProvider}`)}
                    </span>
                  </div>

                  {order.paymentProvider !== 'CASH_ON_DELIVERY' && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        {t('ordersPage.paymentStatusLabel')}
                      </span>
                      <span className={styles.paymentStatusControl}>
                        <span
                          className={
                            order.paymentStatus === 'PAID'
                              ? styles.paymentStatusPaid
                              : styles.paymentStatusPending
                          }
                        >
                          {t(`ordersPage.paymentStatus.${order.paymentStatus}`)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTogglePaymentStatus(order)}
                          className={styles.paymentStatusButton}
                        >
                          {order.paymentStatus === 'PAID'
                            ? t('ordersPage.markUnpaid')
                            : t('ordersPage.markPaid')}
                        </button>
                        {order.paymentProofUrl && (
                          <a
                            href={order.paymentProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.paymentProofLink}
                          >
                            {t('ordersPage.paymentProof')}
                          </a>
                        )}
                      </span>
                    </div>
                  )}

                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>
                      {t('ordersPage.delivery')}
                    </span>
                    <span>
                      {t(`ordersPage.deliveryMethod.${order.deliveryMethod as DeliveryMethod}`)}
                      {order.novaPoshtaCity && `, ${order.novaPoshtaCity}`}
                      {order.novaPoshtaWarehouse && ` — ${order.novaPoshtaWarehouse}`}
                    </span>
                  </div>

                  {order.callMeRequested && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        {t('ordersPage.contact')}
                      </span>
                      <span>{t('ordersPage.callRequested')}</span>
                    </div>
                  )}

                  {(deliveryCost > 0 || codFee > 0) && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        {t('ordersPage.amountBreakdown')}
                      </span>
                      <span>
                        {t('ordersPage.items')}: {itemsSubtotal.toLocaleString()} ₴
                        {deliveryCost > 0 &&
                          ` + ${t('ordersPage.deliveryCost')}: ${deliveryCost.toLocaleString()} ₴`}
                        {codFee > 0 &&
                          ` + ${t('ordersPage.codFee')}: ${codFee.toLocaleString()} ₴`}
                      </span>
                    </div>
                  )}
                </div>

                <ul className={styles.itemsList}>
                  {order.items.map((item) => (
                    <li key={item.id} className={styles.itemRow}>
                      <span className={styles.itemTitle}>
                        {item.painting?.title ??
                          t('ordersPage.paintingFallback', { id: item.paintingId })}
                      </span>
                      <span className={styles.itemPrice}>
                        {item.quantity} × {Number(item.price).toLocaleString()} ₴
                      </span>
                    </li>
                  ))}
                </ul>

                {order.comment && (
                  <p className={styles.comment}>
                    <span className={styles.commentLabel}>
                      {t('ordersPage.comment')}
                    </span>{' '}
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
                      {t(`ordersPage.status.${status}`)}
                    </button>
                  ))}
                </div>

                {shippingOrderId === order.id && (
                  <div className={styles.trackingRow}>
                    <input
                      value={trackingInput}
                      onChange={(event) => setTrackingInput(event.target.value)}
                      placeholder={t('ordersPage.trackingPlaceholder')}
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
                      {t('ordersPage.shipped')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShippingOrderId(null)}
                      className={styles.trackingCancel}
                    >
                      {t('ordersPage.cancel')}
                    </button>
                  </div>
                )}

                {order.trackingNumber && shippingOrderId !== order.id && (
                  <p className={styles.trackingLine}>
                    {t('ordersPage.trackingLine')}{' '}
                    <strong>{order.trackingNumber}</strong>
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
                          !statusMailLabel(order.status) || sendStatusMail.isPending
                        }
                        title={
                          statusMailLabel(order.status)
                            ? undefined
                            : t('ordersPage.noMailTitle')
                        }
                        className={styles.mailButton}
                      >
                        {statusMailLabel(order.status) ?? t('ordersPage.noMailButton')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendApologyMail(order)}
                        disabled={sendApologyMail.isPending}
                        className={styles.apologyButton}
                      >
                        {t('ordersPage.apologyMail')}
                      </button>
                    </>
                  ) : (
                    <span className={styles.mailMuted}>{t('ordersPage.noEmail')}</span>
                  )}
                </div>

                {order.status === 'CANCELLED' && (
                  <button
                    onClick={() => handleDelete(order)}
                    className={styles.deleteButton}
                  >
                    {t('ordersPage.deleteOrder')}
                  </button>
                )}

                {order.status === 'COMPLETED' && !order.isArchived && (
                  <button
                    onClick={() => handleArchive(order)}
                    className={styles.archiveButton}
                  >
                    {t('ordersPage.removeFromView')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pager}>
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className={styles.pagerButton}
          >
            {t('ordersPage.pager.previous')}
          </button>

          <span className={styles.pagerLabel}>
            {t('ordersPage.pager.position', { page, totalPages })}
          </span>

          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={page >= totalPages}
            className={styles.pagerButton}
          >
            {t('ordersPage.pager.next')}
          </button>
        </div>
      )}
    </div>
  );
}
