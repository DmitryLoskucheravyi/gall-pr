import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from '../components/ui/LocalizedLink';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useLocale } from '../hooks/useLocale';
import { pickLocale } from '../utils/localizedField';
import { useExchangeRate } from '../hooks/queries/useExchangeRate';
import { formatPrice } from '../utils/formatPrice';
import type { CartItem } from '../types/cart.types';
import type { PaymentProvider } from '../types/order.types';
import type { NovaPoshtaOption } from '../types/novaPoshta.types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { showToast } from '../store/slices/toastSlice';
import { useCart } from '../hooks/queries/useCart';
import { useRemoveCartItemMutation } from '../hooks/mutations/useCartMutations';
import { useCheckoutMutation } from '../hooks/mutations/useCheckoutMutation';
import { useCardTransferIban } from '../hooks/queries/useSettings';
import {
  useNovaPoshtaWarehouses,
  useNovaPoshtaDeliveryPrice,
} from '../hooks/queries/useNovaPoshta';
import { submitPaymentForm } from '../utils/submitPaymentForm';
import Skeleton from '../components/ui/Skeleton';
import Select from '../components/ui/Select';
import NovaPoshtaCityPicker from '../components/ui/NovaPoshtaCityPicker';
import InfoTooltip from '../components/ui/InfoTooltip';
import Checkbox from '../components/ui/Checkbox';
import styles from './CartPage.module.scss';

function FloatField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  multiline = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className={styles.floatField}>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          placeholder=" "
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.floatInput}
        />
      ) : (
        <input
          id={id}
          type={type}
          required={required}
          placeholder=" "
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.floatInput}
        />
      )}
      <label htmlFor={id} className={styles.floatLabel}>
        {label}
      </label>
    </div>
  );
}

export default function CartPage() {
  const { t } = useTranslation('cart');
  const locale = useLocale();
  const { data: usdRate } = useExchangeRate();
  const navigate = useLocalizedNavigate();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const PAYMENT_OPTIONS: { value: PaymentProvider; label: string }[] = [
    { value: 'CASH_ON_DELIVERY', label: t('payment.cod') },
    { value: 'CARD_TRANSFER', label: t('payment.cardTransfer') },
  ];

  const { data: cart, isLoading: loading } = useCart();
  const removeItem = useRemoveCartItemMutation();
  const checkout = useCheckoutMutation();

  const items: CartItem[] = cart?.items ?? [];
  const total = cart?.total ?? 0;

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [comment, setComment] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider | null>(null);
  const [callMeRequested, setCallMeRequested] = useState(false);

  const [npSelectedCity, setNpSelectedCity] = useState<NovaPoshtaOption | null>(null);
  const [npWarehouseRef, setNpWarehouseRef] = useState('');

  const cardTransferIban = useCardTransferIban();
  const { data: warehouseOptions = [] } = useNovaPoshtaWarehouses(
    npSelectedCity?.ref ?? null,
  );
  const { data: deliveryPrice } = useNovaPoshtaDeliveryPrice(
    npSelectedCity?.ref ?? null,
    paymentProvider === 'CASH_ON_DELIVERY',
  );

  const shippingCost = npSelectedCity && deliveryPrice ? deliveryPrice.shippingCost : 0;
  const codFee =
    npSelectedCity && deliveryPrice && paymentProvider === 'CASH_ON_DELIVERY'
      ? deliveryPrice.redeliveryCost
      : 0;
  const grandTotal = total + shippingCost + codFee;

  const handleRemove = (item: CartItem) => {
    removeItem.mutate(item.paintingId);
  };

  const handleCheckout = async () => {
    if (checkout.isPending || items.length === 0) return;

    if (
      !isAuthenticated &&
      (!guestName.trim() || !guestPhone.trim() || !guestEmail.trim())
    ) {
      dispatch(
        showToast({
          // Email is where every update about this order goes — a guest has
          // no account to check.
          message: t('toasts.guestFieldsRequired'),
          variant: 'error',
        }),
      );
      return;
    }

    if (!paymentProvider) {
      dispatch(
        showToast({ message: t('toasts.choosePayment'), variant: 'error' }),
      );
      return;
    }

    if (!npSelectedCity || !npWarehouseRef) {
      dispatch(
        showToast({
          message: t('toasts.chooseDelivery'),
          variant: 'error',
        }),
      );
      return;
    }

    // Refs only — the backend resolves both names from Nova Poshta itself.
    // Sending the display names too meant the address written onto the order
    // and the address the delivery fee was priced for could disagree.
    const novaPoshtaExtra = {
      novaPoshtaCityRef: npSelectedCity.ref,
      novaPoshtaWarehouseRef: npWarehouseRef,
    };

    try {
      const order = await checkout.mutateAsync(
        isAuthenticated
          ? {
              paymentProvider,
              deliveryMethod: 'NOVA_POSHTA',
              callMeRequested,
              comment: comment.trim() || undefined,
              ...novaPoshtaExtra,
            }
          : {
              paymentProvider,
              deliveryMethod: 'NOVA_POSHTA',
              callMeRequested,
              guestName: guestName.trim(),
              guestPhone: guestPhone.trim(),
              guestEmail: guestEmail.trim(),
              comment: comment.trim() || undefined,
              ...novaPoshtaExtra,
            },
      );

      if (order.paymentForm) {
        submitPaymentForm(order.paymentForm);
        return;
      }

      if (isAuthenticated) {
        dispatch(
          showToast({ message: t('toasts.orderAcceptedAuth', { id: order.id }) }),
        );
        navigate('/orders');
      } else {
        dispatch(
          showToast({
            message: t('toasts.orderAcceptedGuest', { id: order.id }),
          }),
        );
        navigate('/');
      }
    } catch (error: any) {
      dispatch(
        showToast({
          message: error?.response?.data?.message ?? t('toasts.checkoutFailed'),
          variant: 'error',
        }),
      );
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className={styles.title}>{t('title')}</h1>
        <div className={styles.items}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={styles.item}>
              <Skeleton className={styles.itemImage} />
              <div className={styles.itemInfoSkeleton}>
                <Skeleton className={styles.skeletonTitle} />
                <Skeleton className={styles.skeletonPrice} />
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

      {items.length === 0 ? (
        <p className={styles.muted}>{t('empty')}</p>
      ) : (
        <div className={styles.layout}>
          <div className={styles.summary}>
            {!isAuthenticated && (
              <div className={styles.guestForm}>
                <p className={styles.guestFormLabel}>{t('guest.label')}</p>
                <FloatField
                  id="guest-name"
                  label={t('guest.name')}
                  required
                  value={guestName}
                  onChange={setGuestName}
                />
                <FloatField
                  id="guest-phone"
                  label={t('guest.phone')}
                  required
                  value={guestPhone}
                  onChange={setGuestPhone}
                />
                <FloatField
                  id="guest-email"
                  label={t('guest.email')}
                  type="email"
                  value={guestEmail}
                  onChange={setGuestEmail}
                />
              </div>
            )}

            <div className={styles.commentField}>
              <FloatField
                id="order-comment"
                label={t('comment')}
                value={comment}
                onChange={setComment}
                multiline
              />
            </div>

            <div className={styles.paymentMethods}>
              <p className={styles.guestFormLabel}>{t('deliveryLabel')}</p>

              <div className={styles.npFields}>
                <NovaPoshtaCityPicker
                  value={npSelectedCity}
                  onChange={(city) => {
                    setNpSelectedCity(city);
                    setNpWarehouseRef('');
                  }}
                />

                {npSelectedCity && (
                  <Select
                    value={npWarehouseRef}
                    onChange={setNpWarehouseRef}
                    options={warehouseOptions.map((warehouse) => ({
                      value: warehouse.ref,
                      label: warehouse.name,
                    }))}
                    placeholder={t('chooseWarehouse')}
                  />
                )}

                {npSelectedCity && deliveryPrice && (
                  <p className={styles.ibanHint}>
                    {t('deliveryPrice', {
                      price: deliveryPrice.shippingCost.toLocaleString(),
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className={styles.paymentMethods}>
              <p className={styles.guestFormLabel}>{t('paymentMethodLabel')}</p>
              <div className={styles.paymentOptions}>
                {PAYMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPaymentProvider(option.value)}
                    className={
                      paymentProvider === option.value
                        ? styles.paymentChipActive
                        : styles.paymentChip
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {paymentProvider === 'CARD_TRANSFER' && (
                <p className={styles.ibanHint}>
                  {cardTransferIban
                    ? t('iban.withIban', { iban: cardTransferIban })
                    : t('iban.withoutIban')}
                </p>
              )}

              {paymentProvider === 'CASH_ON_DELIVERY' && (
                <p className={styles.ibanHint}>
                  {t('codFee.label', {
                    fee: total <= 2000 ? '30 ₴ + 2%' : '50 ₴ + 1%',
                  })}
                  {npSelectedCity && deliveryPrice && (
                    <InfoTooltip
                      text={t('codFee.exact', {
                        amount: deliveryPrice.redeliveryCost.toLocaleString(),
                      })}
                    />
                  )}
                </p>
              )}
            </div>

            <Checkbox
              checked={callMeRequested}
              onChange={setCallMeRequested}
              className={styles.checkboxLabel}
            >
              {t('callMe')}
            </Checkbox>

            {shippingCost > 0 && (
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{t('summary.delivery')}</span>
                <span>{formatPrice(shippingCost, locale, usdRate)}</span>
              </div>
            )}

            {codFee > 0 && (
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{t('summary.codFee')}</span>
                <span>{formatPrice(codFee, locale, usdRate)}</span>
              </div>
            )}

            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{t('summary.total')}</span>
              <span className={styles.summaryTotal}>
                {formatPrice(grandTotal, locale, usdRate)}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkout.isPending}
              className={styles.checkoutButton}
            >
              {checkout.isPending ? t('checkingOut') : t('checkoutButton')}
            </button>
          </div>

          <div className={styles.items}>
            {items.map((item) => (
              <div key={item.id} className={styles.item}>
                <img
                  src={item.painting.cardImage}
                  alt={pickLocale(item.painting, 'title', locale)}
                  className={styles.itemImage}
                />

                <div className={styles.itemInfo}>
                  <Link
                    to={`/painting/${item.paintingId}`}
                    className={styles.itemTitle}
                  >
                    {pickLocale(item.painting, 'title', locale)}
                  </Link>
                  <p className={styles.itemPrice}>
                    {formatPrice(Number(item.painting.price), locale, usdRate)}
                  </p>
                </div>

                <button
                  onClick={() => handleRemove(item)}
                  className={styles.removeButton}
                >
                  {t('remove')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
