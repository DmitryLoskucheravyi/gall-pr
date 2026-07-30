import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { CartItem } from '../types/cart.types';
import type { DeliveryMethod, PaymentProvider } from '../types/order.types';
import type { NovaPoshtaOption } from '../types/novaPoshta.types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { showToast } from '../store/slices/toastSlice';
import { useCart } from '../hooks/queries/useCart';
import { useRemoveCartItemMutation } from '../hooks/mutations/useCartMutations';
import { useCheckoutMutation } from '../hooks/mutations/useCheckoutMutation';
import { useCardTransferIban } from '../hooks/queries/useSettings';
import {
  useNovaPoshtaCities,
  useNovaPoshtaWarehouses,
} from '../hooks/queries/useNovaPoshta';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { submitPaymentForm } from '../utils/submitPaymentForm';
import Skeleton from '../components/ui/Skeleton';
import Select from '../components/ui/Select';
import styles from './CartPage.module.scss';
import selectStyles from '../components/ui/Select.module.scss';

const PAYMENT_OPTIONS: { value: PaymentProvider; label: string }[] = [
  { value: 'CASH_ON_DELIVERY', label: 'Оплата при отриманні' },
  { value: 'CARD_TRANSFER', label: 'Переказ на карту' },
];

const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string }[] = [
  { value: 'NOVA_POSHTA', label: 'Нова пошта' },
  { value: 'UKRPOSHTA', label: 'Укрпошта' },
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
  const [guestAddress, setGuestAddress] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [comment, setComment] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const [callMeRequested, setCallMeRequested] = useState(false);

  const [npCityQuery, setNpCityQuery] = useState('');
  const [npCityOpen, setNpCityOpen] = useState(false);
  const [npSelectedCity, setNpSelectedCity] = useState<NovaPoshtaOption | null>(null);
  const [npWarehouseRef, setNpWarehouseRef] = useState('');

  const cardTransferIban = useCardTransferIban();
  const debouncedCityQuery = useDebouncedValue(npCityQuery, 300);
  const { data: cityOptions = [] } = useNovaPoshtaCities(debouncedCityQuery);
  const { data: warehouseOptions = [] } = useNovaPoshtaWarehouses(
    npSelectedCity?.ref ?? null,
  );

  const handleRemove = (item: CartItem) => {
    removeItem.mutate(item.paintingId);
  };

  const handleCheckout = async () => {
    if (checkout.isPending || items.length === 0) return;

    if (
      !isAuthenticated &&
      (!guestName.trim() || !guestPhone.trim() || !guestAddress.trim())
    ) {
      dispatch(
        showToast({
          message: "Вкажіть ім'я, телефон і адресу для оформлення замовлення",
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

    if (!deliveryMethod) {
      dispatch(
        showToast({ message: 'Оберіть спосіб доставки', variant: 'error' }),
      );
      return;
    }

    if (deliveryMethod === 'NOVA_POSHTA' && (!npSelectedCity || !npWarehouseRef)) {
      dispatch(
        showToast({
          message: 'Оберіть місто та відділення Нової пошти',
          variant: 'error',
        }),
      );
      return;
    }

    const novaPoshtaExtra =
      deliveryMethod === 'NOVA_POSHTA'
        ? {
            novaPoshtaCity: npSelectedCity!.name,
            novaPoshtaWarehouse: warehouseOptions.find(
              (warehouse) => warehouse.ref === npWarehouseRef,
            )?.name,
          }
        : {};

    try {
      const order = await checkout.mutateAsync(
        isAuthenticated
          ? {
              paymentProvider,
              deliveryMethod,
              callMeRequested,
              comment: comment.trim() || undefined,
              ...novaPoshtaExtra,
            }
          : {
              paymentProvider,
              deliveryMethod,
              callMeRequested,
              guestName: guestName.trim(),
              guestPhone: guestPhone.trim(),
              guestAddress: guestAddress.trim(),
              guestEmail: guestEmail.trim() || undefined,
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
                  id="guest-address"
                  label="Адреса доставки"
                  required
                  value={guestAddress}
                  onChange={setGuestAddress}
                />
                <FloatField
                  id="guest-email"
                  label="Email (необов'язково)"
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
              <p className={styles.guestFormLabel}>Спосіб доставки</p>
              <div className={styles.paymentOptions}>
                {DELIVERY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDeliveryMethod(option.value)}
                    className={
                      deliveryMethod === option.value
                        ? styles.paymentChipActive
                        : styles.paymentChip
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {deliveryMethod === 'NOVA_POSHTA' && (
                <div className={styles.npFields}>
                  <div className={styles.npCityField}>
                    <input
                      value={npCityQuery}
                      onChange={(e) => {
                        setNpCityQuery(e.target.value);
                        setNpSelectedCity(null);
                        setNpWarehouseRef('');
                        setNpCityOpen(true);
                      }}
                      onFocus={() => setNpCityOpen(true)}
                      onBlur={() => setNpCityOpen(false)}
                      placeholder="Почніть вводити назву міста"
                      className={styles.npCityInput}
                    />
                    {npCityOpen && cityOptions.length > 0 && (
                      <ul className={selectStyles.menu}>
                        {cityOptions.map((city) => (
                          <li key={city.ref}>
                            <button
                              type="button"
                              onMouseDown={() => {
                                setNpCityQuery(city.name);
                                setNpSelectedCity(city);
                                setNpWarehouseRef('');
                                setNpCityOpen(false);
                              }}
                              className={selectStyles.option}
                            >
                              {city.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

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
                </div>
              )}
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
            </div>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={callMeRequested}
                onChange={(e) => setCallMeRequested(e.target.checked)}
              />
              Зателефонувати мені
            </label>

            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Разом</span>
              <span className={styles.summaryTotal}>
                {total.toLocaleString()} ₴
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
