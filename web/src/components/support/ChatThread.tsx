import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { SupportMessage, SupportSenderRole } from '../../types/support.types';
import styles from './ChatThread.module.scss';

type ChatThreadProps = {
  messages: SupportMessage[];
  loading: boolean;
  // Which side of the conversation this viewer is on — their own messages
  // sit on the right. The only thing that differs between the customer's
  // chat and the admin's.
  ownRole: SupportSenderRole;
  onSend: (content: string) => void;
  emptyText: string;
  // Admin puts the customer's name, status and the back button up here; the
  // customer's own chat has nothing to show and leaves it out.
  header?: ReactNode;
  disabled?: boolean;
};

// The conversation itself — header, scrolling transcript, composer — shared
// so the admin's view of a chat is the same object the customer is looking
// at. Sizing is the caller's business: this fills whatever box it's put in.
export default function ChatThread({
  messages,
  loading,
  ownRole,
  onSend,
  emptyText,
  header,
  disabled = false,
}: ChatThreadProps) {
  const [input, setInput] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);

  // Scroll only the transcript, never the page. scrollIntoView would bubble
  // up and yank the whole window down to the footer on each new message.
  useEffect(() => {
    const element = messagesRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || disabled) return;

    onSend(content);
    setInput('');
  };

  return (
    <div className={styles.thread}>
      {header}

      <div ref={messagesRef} className={styles.messages}>
        {loading ? (
          <p className={styles.notice}>Завантаження…</p>
        ) : messages.length === 0 ? (
          <p className={styles.notice}>{emptyText}</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.bubbleRow} ${
                message.senderRole === ownRole ? styles.own : ''
              }`}
            >
              <div className={styles.bubble}>{message.content}</div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className={styles.composer}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Повідомлення…"
          className={styles.input}
          disabled={disabled}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={disabled || input.trim().length === 0}
          aria-label="Надіслати"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h13M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
