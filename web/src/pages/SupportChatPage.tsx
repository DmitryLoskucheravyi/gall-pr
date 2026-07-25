import { useEffect, useRef, useState } from 'react';

import { supportService } from '../api/support.api';
import type { SupportMessage } from '../types/support.types';
import { useSupportSocket } from '../hooks/useSupportSocket';
import styles from './SupportChatPage.module.scss';

export default function SupportChatPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  const socket = useSupportSocket(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  return (
    <div>
      <h1 className={styles.title}>Підтримка</h1>

      <div className={styles.panel}>
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
            Надіслати
          </button>
        </form>
      </div>
    </div>
  );
}
