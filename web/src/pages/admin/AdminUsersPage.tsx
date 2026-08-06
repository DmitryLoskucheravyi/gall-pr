import { useAdminUsers } from '../../hooks/queries/useUsers';
import { useDeleteUserMutation } from '../../hooks/mutations/useUserMutations';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import Skeleton from '../../components/ui/Skeleton';
import { useAppSelector } from '../../store/hooks';
import type { AdminUser } from '../../types/user.types';
import styles from './AdminUsersPage.module.scss';

function fullName(user: AdminUser) {
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return name || '—';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function AdminUsersPage() {
  const { data: users = [], isLoading: loading } = useAdminUsers();
  const deleteUser = useDeleteUserMutation();
  const confirm = useConfirm();
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  const handleDelete = async (user: AdminUser) => {
    const ok = await confirm({
      title: 'Видалити користувача?',
      message: `${fullName(user)} (${user.email}) буде видалено. Замовлення збережуться, але стануть анонімними.`,
      confirmLabel: 'Видалити',
      danger: true,
    });
    if (!ok) return;
    deleteUser.mutate(user.id);
  };

  return (
    <div>
      <h1 className={styles.title}>Користувачі</h1>

      {loading ? (
        <div className={styles.list}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className={styles.rowSkeleton} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className={styles.muted}>Користувачів поки немає</p>
      ) : (
        <>
          <p className={styles.count}>Усього: {users.length}</p>
          <div className={styles.list}>
            {users.map((user) => (
              <div key={user.id} className={styles.row}>
                <div className={styles.info}>
                  <div className={styles.nameRow}>
                    <span className={styles.name}>{fullName(user)}</span>
                    {user.role === 'ADMIN' && (
                      <span className={styles.adminBadge}>Адмін</span>
                    )}
                  </div>
                  <div className={styles.meta}>
                    <a href={`mailto:${user.email}`} className={styles.email}>
                      {user.email}
                    </a>
                    {user.phone && <span>· {user.phone}</span>}
                    <span className={styles.date}>
                      · з {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(user)}
                  disabled={user.id === currentUserId}
                  title={
                    user.id === currentUserId
                      ? 'Не можна видалити власний акаунт'
                      : 'Видалити'
                  }
                  className={styles.deleteButton}
                >
                  Видалити
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
