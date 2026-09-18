'use client';

import { useTranslation } from 'react-i18next';

import { useAdminUsers } from '../../hooks/queries/useUsers';
import { useDeleteUserMutation } from '../../hooks/mutations/useUserMutations';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import Skeleton from '../../components/ui/Skeleton';
import { useAppSelector } from '../../store/hooks';
import { useLocale } from '../../hooks/useLocale';
import type { AdminUser } from '../../types/user.types';
import styles from './AdminUsersPage.module.scss';

function fullName(user: AdminUser) {
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return name || '—';
}

function formatDate(value: string, locale: 'ua' | 'en') {
  return new Date(value).toLocaleDateString(locale === 'en' ? 'en-GB' : 'uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function AdminUsersPage() {
  const { t } = useTranslation('admin');
  const locale = useLocale();
  const { data: users = [], isLoading: loading } = useAdminUsers();
  const deleteUser = useDeleteUserMutation();
  const confirm = useConfirm();
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  const handleDelete = async (user: AdminUser) => {
    const ok = await confirm({
      title: t('users.confirmDelete.title'),
      message: t('users.confirmDelete.message', {
        name: fullName(user),
        email: user.email,
      }),
      confirmLabel: t('users.confirmDelete.confirmLabel'),
      danger: true,
    });
    if (!ok) return;
    deleteUser.mutate(user.id);
  };

  return (
    <div>
      <h1 className={styles.title}>{t('users.title')}</h1>

      {loading ? (
        <div className={styles.list}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className={styles.rowSkeleton} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className={styles.muted}>{t('users.empty')}</p>
      ) : (
        <>
          <p className={styles.count}>{t('users.total', { count: users.length })}</p>
          <div className={styles.list}>
            {users.map((user) => (
              <div key={user.id} className={styles.row}>
                <div className={styles.info}>
                  <div className={styles.nameRow}>
                    <span className={styles.name}>{fullName(user)}</span>
                    {user.role === 'ADMIN' && (
                      <span className={styles.adminBadge}>{t('users.adminBadge')}</span>
                    )}
                  </div>
                  <div className={styles.meta}>
                    <a href={`mailto:${user.email}`} className={styles.email}>
                      {user.email}
                    </a>
                    {user.phone && <span>· {user.phone}</span>}
                    <span className={styles.date}>
                      {t('users.since', { date: formatDate(user.createdAt, locale) })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(user)}
                  disabled={user.id === currentUserId}
                  title={
                    user.id === currentUserId
                      ? t('users.cantDeleteSelf')
                      : t('users.delete')
                  }
                  className={styles.deleteButton}
                >
                  {t('users.delete')}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
