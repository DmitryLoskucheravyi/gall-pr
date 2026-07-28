import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { CartItem } from '../types/cart.types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { showToast } from '../store/slices/toastSlice';
import { useCart } from '../hooks/queries/useCart';
import { useRemoveCartItemMutation } from '../hooks/mutations/useCartMutations';
import { useCheckoutMutation } from '../hooks/mutations/useCheckoutMutation';
import Skeleton from '../components/ui/Skeleton';
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

    try {
      const order = await checkout.mutateAsync(
        isAuthenticated
          ? { comment: comment.trim() || undefined }
          : {
              guestName: guestName.trim(),
              guestPhone: guestPhone.trim(),
              guestAddress: guestAddress.trim(),
              guestEmail: guestEmail.trim() || undefined,
              comment: comment.trim() || undefined,
            },
      );

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
