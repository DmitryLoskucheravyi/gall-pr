import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { cartService } from '../api/cart.api';
import { ordersService } from '../api/orders.api';
import type { CartItem } from '../types/cart.types';
import { useAppDispatch } from '../store/hooks';
import { setCartCount } from '../store/slices/cartSlice';
import { showToast } from '../store/slices/toastSlice';
import Skeleton from '../components/ui/Skeleton';
import styles from './CartPage.module.scss';

export default function CartPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const cart = await cartService.getCart();
      setItems(cart.items);
      setTotal(cart.total);
      dispatch(
        setCartCount(cart.items.reduce((sum, item) => sum + item.quantity, 0)),
      );
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (item: CartItem) => {
    await cartService.removeItem(item.paintingId);
    loadCart();
  };

  const handleCheckout = async () => {
    if (checkingOut || items.length === 0) return;

    try {
      setCheckingOut(true);
      const order = await ordersService.checkout();
      dispatch(
        showToast({ message: `Замовлення №${order.id} прийнято в обробку` }),
      );
      navigate('/orders');
    } catch (error: any) {
      dispatch(
        showToast({
          message:
            error?.response?.data?.message ??
            'Не вдалося оформити замовлення',
          variant: 'error',
        }),
      );
      loadCart();
    } finally {
      setCheckingOut(false);
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

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Разом</span>
              <span className={styles.summaryTotal}>
                {total.toLocaleString()} ₴
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className={styles.checkoutButton}
            >
              {checkingOut ? 'Оформлюємо…' : 'Оформити замовлення'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
