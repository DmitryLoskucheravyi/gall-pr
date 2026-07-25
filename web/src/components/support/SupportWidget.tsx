import { useEffect, useRef, useState } from 'react';

import { supportService } from '../../api/support.api';
import type { SupportMessage } from '../../types/support.types';
import { useSupportSocket } from '../../hooks/useSupportSocket';
import { useAppSelector } from '../../store/hooks';
import styles from './SupportWidget.module.scss';

export default function SupportWidget() {
  const userId = useAppSelector((state) => state.auth.user?.id);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const socket = useSupportSocket(isOpen);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    supportService
      .getMyChat()
      .then(({ messages }) => {
        setMessages(messages);
        setUnread(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message: SupportMessage) => {
      setMessages((prev) => [...prev, message]);
      if (!isOpen && message.senderRole === 'ADMIN') {
        setUnread((prev) => prev + 1);
      }
    };

    socket.on('support:message', handleMessage);
    return () => {
      socket.off('support:message', handleMessage);
    };
  }, [socket, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || !socket) return;

    socket.emit('support:message', { content });
    setInput('');
  };

  if (!userId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Підтримка"
        className={styles.launcher}
      >
        {unread > 0 && !isOpen && (
          <span className={styles.badge}>{unread}</span>
        )}
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>Підтримка</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Закрити"
              className={styles.closeButton}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className={styles.messages}>
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
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Повідомлення…"
              className={styles.input}
            />
            <button type="submit" className={styles.sendButton}>
              →
            </button>
          </form>
        </div>
      )}
    </>
  );
}
