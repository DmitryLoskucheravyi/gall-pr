'use client';

import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { useMyOrders } from '../hooks/queries/useOrders';
import { useCancelOrderMutation } from '../hooks/mutations/useOrderMutations';
import type { Order } from '../types/order.types';
import Skeleton from '../components/ui/Skeleton';
import OrderPreviewCard from '../components/OrderPreviewCard';
import cardStyles from '../components/OrderPreviewCard.module.scss';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { LocalizedLink as Link } from '../components/ui/LocalizedLink';
import { useAppSelector } from '../store/hooks';
import styles from './OrdersPage.module.scss';

export default function OrdersPage() {
  const { t } = useTranslation('orders');
  const { data: orders = [], isPending: loading } = useMyOrders();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const cancelOrder = useCancelOrderMutation();
  const confirm = useConfirm();

  // The thank-you letter links here with ?review=<id>: that order's card
  // opens its review form. Read from the address rather than through
  // useSearchParams, which would need a Suspense boundary on a static page;
  // empty on the server, so hydration agrees.
  const search = useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => '',
  );
  const reviewId = Number(new URLSearchParams(search).get('review')) || null;

  const handleCancel = async (order: Order) => {
    const ok = await confirm({
      title: t('confirmCancel.title', { id: order.id }),
      message: t('confirmCancel.message'),
      confirmLabel: t('confirmCancel.confirmLabel'),
      cancelLabel: t('confirmCancel.cancelLabel'),
      danger: true,
    });
    if (!ok) return;
    cancelOrder.mutate(order.id);
  };

  if (loading) {
    return (
      <div>
        <h1 className={styles.title}>{t('title')}</h1>
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
      <h1 className={styles.title}>{t('title')}</h1>

      {!isAuthenticated && (
        // A guest's orders live with this browser; signing in brings them
        // into the account (POST /orders/claim-guest on login).
        <p className={styles.guestNote}>
          {t('guestNote')}{' '}
          <Link to="/login" className={styles.guestLink}>
            {t('guestLogin')}
          </Link>
        </p>
      )}

      {orders.length === 0 ? (
        <p className={styles.muted}>{t('empty')}</p>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => (
            <OrderPreviewCard
              key={order.id}
              order={order}
              onCancel={() => handleCancel(order)}
              openReview={order.id === reviewId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
