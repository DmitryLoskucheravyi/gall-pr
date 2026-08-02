import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useLikedPaintings } from '../hooks/queries/useLikedPaintings';
import { useMyOrders } from '../hooks/queries/useOrders';
import {
  useTelegramLinkMutation,
  useRedeemTelegramLinkCodeMutation,
} from '../hooks/mutations/useUserMutations';
import { useEscapeKey } from '../hooks/useEscapeKey';
import GalleryCard from '../components/GalleryCard';
import GalleryCardSkeleton from '../components/GalleryCardSkeleton';
import OrderPreviewCard from '../components/OrderPreviewCard';
import Skeleton from '../components/ui/Skeleton';
import { useAppSelector } from '../store/hooks';
import styles from './ProfilePage.module.scss';

const FAVORITES_PREVIEW_LIMIT = 6;
const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as
  | string
  | undefined;

export default function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user);
  const { data: likedPaintings = [], isLoading: likedLoading } = useLikedPaintings();
  const { data: orders = [], isLoading: ordersLoading } = useMyOrders();
  const telegramLink = useTelegramLinkMutation();
  const redeemCode = useRedeemTelegramLinkCodeMutation();
  const [linkOpened, setLinkOpened] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [pendingCode, setPendingCode] = useState('');

  useEscapeKey(() => setCodeModalOpen(false), codeModalOpen);

  useEffect(() => {
    if (!codeModalOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [codeModalOpen]);

  if (!user) return null;

  const handleTelegramLink = async () => {
    const { code } = await telegramLink.mutateAsync();
    window.open(
      `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`,
      '_blank',
      'noopener,noreferrer',
    );
    setLinkOpened(true);
  };

  const openCodeModal = () => {
    setPendingCode('');
    redeemCode.reset();
    setCodeModalOpen(true);
  };

  const handleRedeemCode = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await redeemCode.mutateAsync(pendingCode);
      setCodeModalOpen(false);
    } catch {
      // error is surfaced inline below via redeemCode.error
    }
  };

  const lastOrder = orders[0] ?? null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className={styles.wrap}>
      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.header}>
            <div className={styles.avatar}>{initials || '?'}</div>

            <div className={styles.headerInfo}>
              <div className={styles.nameRow}>
                <h1 className={styles.name}>
                  {user.firstName} {user.lastName}
                </h1>
                {user.role === 'ADMIN' && (
                  <span className={styles.adminBadge}>Адміністратор</span>
                )}
              </div>
              <p className={styles.email}>{user.email}</p>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.infoLabel}>Email</p>
              <p className={styles.infoValue}>{user.email}</p>
            </div>

            <div className={styles.statCard}>
              <p className={styles.infoLabel}>Телефон</p>
              <p className={styles.infoValue}>{user.phone || '—'}</p>
            </div>

            <div className={`${styles.statCard} ${styles.telegramCard}`}>
              <p className={styles.infoLabel}>Telegram</p>
              {user.telegramLinked ? (
                <p className={styles.telegramLinked}>
                  ✓ Звʼязано — сповіщення про замовлення приходять у Telegram
                </p>
              ) : !TELEGRAM_BOT_USERNAME ? (
                <p className={styles.infoValue}>Незабаром</p>
              ) : (
                <>
                  <p className={styles.telegramHint}>
                    Отримуйте статуси замовлень у Telegram
                  </p>
                  <button
                    type="button"
                    onClick={handleTelegramLink}
                    disabled={telegramLink.isPending}
                    className={styles.telegramButton}
                  >
                    {linkOpened
                      ? 'Відкрити ще раз'
                      : telegramLink.isPending
                        ? 'Генеруємо…'
                        : "Прив'язати Telegram"}
                  </button>
                  {linkOpened && (
                    <p className={styles.telegramHint}>
                      Натисніть Start у Telegram — акаунт звʼяжеться автоматично
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={openCodeModal}
                    className={styles.telegramCodeLink}
                  >
                    Вже є код з Telegram? Ввести
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={styles.ordersHeader}>
            <h2 className={styles.ordersTitle}>Замовлення</h2>
            {orders.length > 0 && (
              <Link to="/orders" className={styles.ordersLink}>
                Усі →
              </Link>
            )}
          </div>

          {ordersLoading ? (
            <Skeleton className={styles.orderSkeleton} />
          ) : lastOrder ? (
            <OrderPreviewCard order={lastOrder} />
          ) : (
            <p className={styles.ordersEmpty}>У вас ще немає замовлень</p>
          )}
        </div>

        <section className={styles.favoritesSection}>
          <div className={styles.favoritesHeader}>
            <h2 className={styles.favoritesTitle}>Уподобані</h2>
            {likedPaintings.length > 0 && (
              <Link to="/favorites" className={styles.favoritesLink}>
                Усі →
              </Link>
            )}
          </div>

          {likedLoading ? (
            <div className={styles.favoritesGrid}>
              {Array.from({ length: 6 }).map((_, index) => (
                <GalleryCardSkeleton key={index} />
              ))}
            </div>
          ) : likedPaintings.length === 0 ? (
            <p className={styles.favoritesEmpty}>
              Ви ще не вподобали жодної картини
            </p>
          ) : (
            <div className={styles.favoritesGrid}>
              {likedPaintings.slice(0, FAVORITES_PREVIEW_LIMIT).map((painting) => (
                <GalleryCard key={painting.id} painting={painting} />
              ))}
            </div>
          )}
        </section>
      </div>

      {codeModalOpen && (
        <div className={styles.codeModalOverlay} onClick={() => setCodeModalOpen(false)}>
          <div
            className={styles.codeModalDialog}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className={styles.codeModalTitle}>Підтвердження Telegram</h2>
            <p className={styles.codeModalHint}>
              Напишіть боту{' '}
              {TELEGRAM_BOT_USERNAME ? (
                <a
                  href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{TELEGRAM_BOT_USERNAME}
                </a>
              ) : (
                'у Telegram'
              )}{' '}
              команду /start — він надішле код підтвердження. Введіть його нижче.
            </p>

            <form onSubmit={handleRedeemCode} className={styles.codeModalForm}>
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={pendingCode}
                onChange={(e) => setPendingCode(e.target.value.replace(/\D/g, ''))}
                className={styles.codeModalInput}
                autoFocus
              />

              {redeemCode.isError && (
                <p className={styles.codeModalError}>
                  {(redeemCode.error as any)?.response?.data?.message ??
                    'Невірний або застарілий код'}
                </p>
              )}

              <div className={styles.codeModalActions}>
                <button
                  type="button"
                  onClick={() => setCodeModalOpen(false)}
                  className={styles.codeModalCancel}
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={redeemCode.isPending || pendingCode.length !== 6}
                  className={styles.codeModalSubmit}
                >
                  {redeemCode.isPending ? 'Перевірка…' : 'Підтвердити'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
