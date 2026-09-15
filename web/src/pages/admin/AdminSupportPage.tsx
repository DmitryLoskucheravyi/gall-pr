import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { supportService } from '../../api/support.api';
import type {
  SupportChatSummary,
  SupportMessage,
} from '../../types/support.types';
import { useSupportSocket } from '../../hooks/useSupportSocket';
import ChatThread from '../../components/support/ChatThread';
import styles from './AdminSupportPage.module.scss';

// A guest has no name, so both of these fall back to the chat number — stable
// across sessions and enough to tell two guests apart in the list.
function initialsOf(chat: SupportChatSummary, t: TFunction<'admin'>) {
  if (!chat.user) return t('supportPage.guestInitial');
  const { firstName, lastName } = chat.user;
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

function nameOf(chat: SupportChatSummary, t: TFunction<'admin'>) {
  if (!chat.user) return t('supportPage.guestName', { id: chat.id });
  return `${chat.user.firstName} ${chat.user.lastName}`.trim() || chat.user.email;
}

function sortChats(chats: SupportChatSummary[]) {
  return [...chats].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

export default function AdminSupportPage() {
  const { t } = useTranslation('admin');
  const [chats, setChats] = useState<SupportChatSummary[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const socket = useSupportSocket(true);

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
      chatId,
      online,
    }: {
      chatId: number;
      online: boolean;
    }) => {
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, isOnline: online } : c)),
      );
    };

    const handleMessage = (message: SupportMessage) => {
      if (message.chatId === selectedChatId) {
        setMessages((prev) => [...prev, message]);
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

  const handleSend = (content: string) => {
    if (!selectedChatId) return;
    socket?.emit('support:message', { chatId: selectedChatId, content });
  };

  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null;

  return (
    <div>
      <h1 className={styles.title}>{t('supportPage.title')}</h1>

      {/* Messenger navigation: on a phone the list and the conversation are
          two screens and this class decides which one is showing. Both panes
          are on screen at once from $breakpoint-md up, where the class stops
          meaning anything. */}
      <div
        className={`${styles.layout} ${selectedChat ? styles.viewingChat : ''}`}
      >
        <div className={styles.listPane}>
          {loadingChats ? (
            <p className={styles.muted}>{t('supportPage.loading')}</p>
          ) : chats.length === 0 ? (
            <p className={styles.muted}>{t('supportPage.empty')}</p>
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
                  <div className={styles.avatar}>{initialsOf(chat, t)}</div>
                  <span
                    className={`${styles.onlineDot} ${
                      chat.isOnline ? styles.online : ''
                    }`}
                  />
                </div>

                <div className={styles.chatInfo}>
                  <div className={styles.chatName}>{nameOf(chat, t)}</div>
                  <div className={styles.chatPreview}>
                    {chat.lastMessage
                      ? `${chat.lastMessage.senderRole === 'ADMIN' ? t('supportPage.you') : ''}${chat.lastMessage.content}`
                      : t('supportPage.noMessages')}
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

        <div className={styles.threadPane}>
          {!selectedChat ? (
            <div className={styles.threadEmpty}>{t('supportPage.chooseChat')}</div>
          ) : (
            <ChatThread
              messages={messages}
              loading={loadingMessages}
              ownRole="ADMIN"
              onSend={handleSend}
              disabled={!socket}
              emptyText={t('supportPage.emptyThread')}
              header={
                <div className={styles.threadHeader}>
                  {/* Phone-only way back to the list; the desktop layout
                      keeps both panes visible, so it has nothing to do
                      there. */}
                  <button
                    type="button"
                    onClick={() => setSelectedChatId(null)}
                    className={styles.backButton}
                    aria-label={t('supportPage.backAria')}
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

                  <div className={styles.avatar}>{initialsOf(selectedChat, t)}</div>

                  <div className={styles.threadHeaderText}>
                    <div className={styles.threadHeaderName}>
                      {nameOf(selectedChat, t)}
                    </div>
                    <div
                      className={`${styles.threadHeaderStatus} ${
                        selectedChat.isOnline ? styles.online : ''
                      }`}
                    >
                      {selectedChat.isOnline
                        ? t('supportPage.online')
                        : t('supportPage.offline')}
                    </div>
                  </div>
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
