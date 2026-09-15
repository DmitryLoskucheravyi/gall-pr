import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { Order, OrderStatus } from '../types/order.types';
import { useUploadPaymentProofMutation } from '../hooks/mutations/useOrderMutations';
import { useLocale } from '../hooks/useLocale';
import { useExchangeRate } from '../hooks/queries/useExchangeRate';
import { formatPrice } from '../utils/formatPrice';
import { plural, pluralForms } from '../utils/plural';
import styles from './OrderPreviewCard.module.scss';

function statusClass(status: OrderStatus) {
  switch (status) {
    case 'CONFIRMED':
    case 'SHIPPED':
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
  const { t } = useTranslation('orders');
  const locale = useLocale();
  const { data: usdRate } = useExchangeRate();
  const uploadProof = useUploadPaymentProofMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    uploadProof.mutate({ id: order.id, file });
  };

  const showProofUpload =
    order.paymentProvider === 'CARD_TRANSFER' && order.paymentStatus === 'PENDING';

  return (
    <div className={styles.order}>
      <div className={styles.orderHeader}>
        <span className={styles.orderNumber}>{t('orderNumber', { id: order.id })}</span>
        <span className={statusClass(order.status)}>{t(`status.${order.status}`)}</span>
      </div>

      <p className={styles.date}>
        {new Date(order.createdAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'uk-UA')}
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
          {order.items.length} {plural(order.items.length, locale, pluralForms(t, 'items'))}
        </span>
        <span className={styles.footerTotal}>
          {formatPrice(Number(order.total), locale, usdRate)}
        </span>
      </div>

      {showProofUpload &&
        (order.paymentProofUrl ? (
          <p className={styles.proofSent}>{t('proofSent')}</p>
        ) : (
          <div className={styles.proofSection}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className={styles.proofInput}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadProof.isPending}
              className={styles.proofButton}
            >
              {uploadProof.isPending ? t('proofUploading') : t('proofUpload')}
            </button>
          </div>
        ))}

      {onCancel && (order.status === 'PENDING' || order.status === 'CONFIRMED') && (
        <button onClick={onCancel} className={styles.cancelButton}>
          {t('cancelButton')}
        </button>
      )}
    </div>
  );
}
