import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
import styles from './CartPage.module.scss';

const PAYMENT_OPTIONS: { value: PaymentProvider; label: string }[] = [
  { value: 'CASH_ON_DELIVERY', label: 'Оплата при отриманні' },
  { value: 'CARD_TRANSFER', label: 'Переказ на карту' },
];

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
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

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
          message: "Вкажіть ім'я, телефон та email для оформлення замовлення",
          variant: 'error',
        }),
      );
      return;
    }

    if (!paymentProvider) {
      dispatch(
        showToast({ message: 'Оберіть спосіб оплати', variant: 'error' }),
      );
      return;
    }

    if (!npSelectedCity || !npWarehouseRef) {
      dispatch(
        showToast({
          message: 'Оберіть місто та відділення Нової пошти',
          variant: 'error',
        }),
      );
      return;
    }

    const novaPoshtaExtra = {
      novaPoshtaCity: npSelectedCity.name,
      novaPoshtaCityRef: npSelectedCity.ref,
      novaPoshtaWarehouse: warehouseOptions.find(
        (warehouse) => warehouse.ref === npWarehouseRef,
      )?.name,
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
          showToast({ message: `Замовлення №${order.id} прийнято в обробку` }),
        );
        navigate('/orders');
      } else {
        dispatch(
          showToast({
            message: `Замовлення №${order.id} прийнято! Ми зв'яжемось з вами за вказаним телефоном.`,
          }),
        );
        navigate('/');
      }
    } catch (error: any) {
      dispatch(
        showToast({
          message:
            error?.response?.data?.message ??
            'Не вдалося оформити замовлення',
          variant: 'error',
        }),
      );
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className={styles.title}>Кошик</h1>
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
      <h1 className={styles.title}>Кошик</h1>

      {items.length === 0 ? (
        <p className={styles.muted}>Кошик порожній</p>
      ) : (
        <div className={styles.layout}>
          <div className={styles.summary}>
            {!isAuthenticated && (
              <div className={styles.guestForm}>
                <p className={styles.guestFormLabel}>Ваші контактні дані</p>
                <FloatField
                  id="guest-name"
                  label="Ім'я та прізвище"
                  required
                  value={guestName}
                  onChange={setGuestName}
                />
                <FloatField
                  id="guest-phone"
                  label="Телефон"
                  required
                  value={guestPhone}
                  onChange={setGuestPhone}
                />
                <FloatField
                  id="guest-email"
                  label="Email"
                  type="email"
                  value={guestEmail}
                  onChange={setGuestEmail}
                />
              </div>
            )}

            <div className={styles.commentField}>
              <FloatField
                id="order-comment"
                label="Коментар до замовлення (необов'язково)"
                value={comment}
                onChange={setComment}
                multiline
              />
            </div>

            <div className={styles.paymentMethods}>
              <p className={styles.guestFormLabel}>Доставка: Нова пошта</p>

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
                    placeholder="Оберіть відділення"
                  />
                )}

                {npSelectedCity && deliveryPrice && (
                  <p className={styles.ibanHint}>
                    Доставка: {deliveryPrice.shippingCost.toLocaleString()} ₴
                  </p>
                )}
              </div>
            </div>

            <div className={styles.paymentMethods}>
              <p className={styles.guestFormLabel}>Спосіб оплати</p>
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
                    ? `Переказ на IBAN: ${cardTransferIban}. Вкажіть номер замовлення в призначенні платежу.`
                    : 'IBAN для переказу буде повідомлено окремо після оформлення.'}
                </p>
              )}

              {paymentProvider === 'CASH_ON_DELIVERY' && (
                <p className={styles.ibanHint}>
                  Комісія за накладений платіж: {total <= 2000 ? '30 ₴ + 2%' : '50 ₴ + 1%'}
                  {npSelectedCity && deliveryPrice && (
                    <InfoTooltip
                      text={`Точна сума для цього замовлення: ${deliveryPrice.redeliveryCost.toLocaleString()} ₴`}
                    />
                  )}
                </p>
              )}
            </div>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={callMeRequested}
                onChange={(e) => setCallMeRequested(e.target.checked)}
              />
              Зателефонувати мені
            </label>

            {shippingCost > 0 && (
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Доставка</span>
                <span>{shippingCost.toLocaleString()} ₴</span>
              </div>
            )}

            {codFee > 0 && (
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  Комісія за накладений платіж
                </span>
                <span>{codFee.toLocaleString()} ₴</span>
              </div>
            )}

            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Разом</span>
              <span className={styles.summaryTotal}>
                {grandTotal.toLocaleString()} ₴
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkout.isPending}
              className={styles.checkoutButton}
            >
              {checkout.isPending ? 'Оформлюємо…' : 'Оформити замовлення'}
            </button>
          </div>

          <div className={styles.items}>
            {items.map((item) => (
              <div key={item.id} className={styles.item}>
                <img
                  src={item.painting.cardImage}
                  alt={item.painting.title}
                  className={styles.itemImage}
                />

                <div className={styles.itemInfo}>
                  <Link
                    to={`/painting/${item.paintingId}`}
                    className={styles.itemTitle}
                  >
                    {item.painting.title}
                  </Link>
                  <p className={styles.itemPrice}>
                    {Number(item.painting.price).toLocaleString()} ₴
                  </p>
                </div>

                <button
                  onClick={() => handleRemove(item)}
                  className={styles.removeButton}
                >
                  Видалити
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
