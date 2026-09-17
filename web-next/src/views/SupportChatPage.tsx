'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { supportService } from '../api/support.api';
import type { SupportMessage } from '../types/support.types';
import { useSupportSocket } from '../hooks/useSupportSocket';
import { useSettings } from '../hooks/queries/useSettings';
import { useScrollToTopAfterKeyboard } from '../hooks/useScrollToTopAfterKeyboard';
import ChatThread from '../components/support/ChatThread';
import { safeExternalUrl } from '../utils/safeUrl';
import styles from './SupportChatPage.module.scss';

export default function SupportChatPage() {
  const { t } = useTranslation('support');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const socket = useSupportSocket(true);
  const { data: settings } = useSettings();
  const navigate = useLocalizedNavigate();
  const scrollToTopAfterKeyboard = useScrollToTopAfterKeyboard();

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
    // On a phone the keyboard has scrolled the page down to sit above itself,
    // and closes on send without scrolling anything back — leaving the chat's
    // header, and the only way out of the conversation, above the top of the
    // screen. No-op on desktop.
    scrollToTopAfterKeyboard();
  };

  return (
    <div>
      <h1 className={styles.title}>{t('title')}</h1>

      <div className={styles.layout}>
        <div className={styles.panel}>
          <ChatThread
            messages={messages}
            loading={loading}
            ownRole="USER"
            onSend={handleSend}
            disabled={!socket}
            emptyText={t('emptyText')}
            header={
              // Phone-only: there the chat is a full screen with no page
              // heading above it, so this carries both the title and the way
              // out. From $breakpoint-md up the page's own <h1> takes over.
              <div className={styles.chatHeader}>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className={styles.backButton}
                  aria-label={t('backAria')}
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
                <span className={styles.chatHeaderTitle}>{t('title')}</span>
              </div>
            }
          />
        </div>

        {hasContacts && (
          <aside className={styles.contacts}>
            <h2 className={styles.contactsTitle}>{t('otherWays')}</h2>
            <p className={styles.contactsHint}>{t('otherWaysHint')}</p>

            <ul className={styles.contactsList}>
              {settings?.supportEmail && (
                <li className={styles.contactItem}>
                  <span className={styles.contactLabel}>{t('email')}</span>
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
                  <span className={styles.contactLabel}>{t('phone')}</span>
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
                    href={safeExternalUrl(settings.supportTelegramUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.contactValue}
                  >
                    {t('telegramLink')}
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
