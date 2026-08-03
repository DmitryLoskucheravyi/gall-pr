import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supportService } from '../api/support.api';
import type { SupportMessage } from '../types/support.types';
import { useSupportSocket } from '../hooks/useSupportSocket';
import { useSettings } from '../hooks/queries/useSettings';
import ChatThread from '../components/support/ChatThread';
import styles from './SupportChatPage.module.scss';

export default function SupportChatPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const socket = useSupportSocket(true);
  const { data: settings } = useSettings();
  const navigate = useNavigate();

  const hasContacts =
    !!settings?.supportEmail ||
    !!settings?.supportPhone ||
    !!settings?.supportTelegramUrl;

  useEffect(() => {
    supportService
      .getMyChat()
      .then(({ messages }) => setMessages(messages))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message: SupportMessage) => {
      setMessages((prev) => [...prev, message]);
    };

    socket.on('support:message', handleMessage);
    return () => {
      socket.off('support:message', handleMessage);
    };
  }, [socket]);

  const handleSend = (content: string) => {
    socket?.emit('support:message', { content });
  };

  return (
    <div>
      <h1 className={styles.title}>Підтримка</h1>

      <div className={styles.layout}>
        <div className={styles.panel}>
          <ChatThread
            messages={messages}
            loading={loading}
            ownRole="USER"
            onSend={handleSend}
            disabled={!socket}
            emptyText="Напишіть нам, якщо виникли питання — ми відповімо якнайшвидше"
            header={
              // Phone-only: there the chat is a full screen with no page
              // heading above it, so this carries both the title and the way
              // out. From $breakpoint-md up the page's own <h1> takes over.
              <div className={styles.chatHeader}>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className={styles.backButton}
                  aria-label="Назад"
                >
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 12H5M11 6l-6 6 6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <span className={styles.chatHeaderTitle}>Підтримка</span>
              </div>
            }
          />
        </div>

        {hasContacts && (
          <aside className={styles.contacts}>
            <h2 className={styles.contactsTitle}>Інші способи зв'язку</h2>
            <p className={styles.contactsHint}>
              Не хочете чекати в чаті? Напишіть нам напряму:
            </p>

            <ul className={styles.contactsList}>
              {settings?.supportEmail && (
                <li className={styles.contactItem}>
                  <span className={styles.contactLabel}>Email</span>
                  <a
                    href={`mailto:${settings.supportEmail}`}
                    className={styles.contactValue}
                  >
                    {settings.supportEmail}
                  </a>
                </li>
              )}

              {settings?.supportPhone && (
                <li className={styles.contactItem}>
                  <span className={styles.contactLabel}>Телефон</span>
                  <a
                    href={`tel:${settings.supportPhone.replace(/\s/g, '')}`}
                    className={styles.contactValue}
                  >
                    {settings.supportPhone}
                  </a>
                </li>
              )}

              {settings?.supportTelegramUrl && (
                <li className={styles.contactItem}>
                  <span className={styles.contactLabel}>Telegram</span>
                  <a
                    href={settings.supportTelegramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.contactValue}
                  >
                    Написати в Telegram
                  </a>
                </li>
              )}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
