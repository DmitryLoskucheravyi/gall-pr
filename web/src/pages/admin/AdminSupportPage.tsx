import { useEffect, useRef, useState } from 'react';

import { supportService } from '../../api/support.api';
import type {
  SupportChatSummary,
  SupportMessage,
} from '../../types/support.types';
import { useSupportSocket } from '../../hooks/useSupportSocket';
import styles from './AdminSupportPage.module.scss';

function initialsOf(chat: SupportChatSummary) {
  const { firstName, lastName } = chat.user;
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

function sortChats(chats: SupportChatSummary[]) {
  return [...chats].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

export default function AdminSupportPage() {
  const [chats, setChats] = useState<SupportChatSummary[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');

  const socket = useSupportSocket(true);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Scroll only the messages container, never the page. scrollIntoView would
  // bubble up and yank the whole window down to the footer.
  const scrollMessagesToBottom = () => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    supportService
      .getChats()
      .then((data) => setChats(sortChats(data)))
      .catch(() => {})
      .finally(() => setLoadingChats(false));
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleChatUpdate = (summary: SupportChatSummary) => {
      setChats((prev) => {
        const withoutIt = prev.filter((c) => c.id !== summary.id);
        const merged =
          summary.id === selectedChatId
            ? { ...summary, unreadByAdmin: 0 }
            : summary;
        return sortChats([...withoutIt, merged]);
      });
    };

    const handlePresence = ({
      userId,
      online,
    }: {
      userId: number;
      online: boolean;
    }) => {
      setChats((prev) =>
        prev.map((c) =>
          c.user.id === userId ? { ...c, isOnline: online } : c,
        ),
      );
    };

    const handleMessage = (message: SupportMessage) => {
      if (message.chatId === selectedChatId) {
        setMessages((prev) => [...prev, message]);
        scrollMessagesToBottom();
      }
    };

    socket.on('support:chatUpdate', handleChatUpdate);
    socket.on('support:presence', handlePresence);
    socket.on('support:message', handleMessage);

    return () => {
      socket.off('support:chatUpdate', handleChatUpdate);
      socket.off('support:presence', handlePresence);
      socket.off('support:message', handleMessage);
    };
  }, [socket, selectedChatId]);

  const handleSelectChat = async (chat: SupportChatSummary) => {
    setSelectedChatId(chat.id);
    setLoadingMessages(true);
    setChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, unreadByAdmin: 0 } : c)),
    );

    try {
      const data = await supportService.getChatMessages(chat.id);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }

    socket?.emit('support:joinChat', { chatId: chat.id });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || !socket || !selectedChatId) return;

    socket.emit('support:message', { chatId: selectedChatId, content });
    setInput('');
  };

  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null;

  return (
    <div>
      <h1 className={styles.title}>Підтримка</h1>

      <div className={styles.layout}>
        <div className={styles.sidebar}>
          {loadingChats ? (
            <p className={styles.muted}>Завантаження…</p>
          ) : chats.length === 0 ? (
            <p className={styles.muted}>Звернень поки немає</p>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => handleSelectChat(chat)}
                className={`${styles.chatRow} ${
                  chat.id === selectedChatId ? styles.active : ''
                }`}
              >
                <div className={styles.avatarWrap}>
                  <div className={styles.avatar}>{initialsOf(chat)}</div>
                  <span
                    className={`${styles.onlineDot} ${
                      chat.isOnline ? styles.online : ''
                    }`}
                  />
                </div>

                <div className={styles.chatInfo}>
                  <div className={styles.chatName}>
                    {chat.user.firstName} {chat.user.lastName}
                  </div>
                  <div className={styles.chatPreview}>
                    {chat.lastMessage
                      ? `${chat.lastMessage.senderRole === 'ADMIN' ? 'Ви: ' : ''}${chat.lastMessage.content}`
                      : 'Немає повідомлень'}
                  </div>
                </div>

                {chat.unreadByAdmin > 0 && (
                  <span className={styles.unreadBadge}>
                    {chat.unreadByAdmin}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div className={styles.thread}>
          {!selectedChat ? (
            <div className={styles.threadEmpty}>
              Оберіть чат зі списку зліва
            </div>
          ) : (
            <>
              <div className={styles.threadHeader}>
                <div className={styles.avatar}>{initialsOf(selectedChat)}</div>
                <div>
                  <div className={styles.threadHeaderName}>
                    {selectedChat.user.firstName} {selectedChat.user.lastName}
                  </div>
                  <div
                    className={`${styles.threadHeaderStatus} ${
                      selectedChat.isOnline ? styles.online : ''
                    }`}
                  >
                    {selectedChat.isOnline ? 'Онлайн' : 'Офлайн'}
                  </div>
                </div>
              </div>

              <div ref={messagesRef} className={styles.threadMessages}>
                {loadingMessages ? (
                  <p className={styles.muted}>Завантаження…</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`${styles.bubbleRow} ${
                        message.senderRole === 'ADMIN' ? styles.own : ''
                      }`}
                    >
                      <div className={styles.bubble}>{message.content}</div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSubmit} className={styles.threadForm}>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
