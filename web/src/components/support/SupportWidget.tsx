import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { supportService } from '../../api/support.api';
import { useAppSelector } from '../../store/hooks';
import styles from './SupportWidget.module.scss';

export default function SupportWidget() {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const navigate = useNavigate();
  const location = useLocation();

  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;

    supportService
      .getMyChat()
      .then(({ chat }) => setUnread(chat.unreadByUser))
      .catch(() => {});
  }, [userId]);

  if (!userId || location.pathname.startsWith('/support')) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/support')}
      aria-label="Підтримка"
      className={styles.launcher}
    >
      {unread > 0 && <span className={styles.badge}>{unread}</span>}
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
