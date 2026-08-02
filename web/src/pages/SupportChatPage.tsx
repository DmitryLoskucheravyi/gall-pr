import { useEffect, useRef, useState } from 'react';

import { supportService } from '../api/support.api';
import type { SupportMessage } from '../types/support.types';
import { useSupportSocket } from '../hooks/useSupportSocket';
import { useSettings } from '../hooks/queries/useSettings';
import styles from './SupportChatPage.module.scss';

export default function SupportChatPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  const socket = useSupportSocket(true);
  const messagesRef = useRef<HTMLDivElement>(null);
  const { data: settings } = useSettings();

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

  // Scroll only the messages container, never the page. scrollIntoView would
  // bubble up and yank the whole window down to the footer on each new message.
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || !socket) return;

    socket.emit('support:message', { content });
    setInput('');
  };

  return (
    <div>
      <h1 className={styles.title}>Підтримка</h1>

      <div className={styles.layout}>
        <div className={styles.panel}>
          <div ref={messagesRef} className={styles.messages}>
            {loading ? (
              <p className={styles.empty}>Завантаження…</p>
            ) : messages.length === 0 ? (
              <p className={styles.empty}>
                Напишіть нам, якщо виникли питання — ми відповімо якнайшвидше
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.bubbleRow} ${
                    message.senderRole === 'USER' ? styles.own : ''
                  }`}
                >
                  <div className={styles.bubble}>{message.content}</div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Повідомлення…"
              className={styles.input}
            />
            <button type="submit" className={styles.sendButton}>
              Надіслати
            </button>
          </form>
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
