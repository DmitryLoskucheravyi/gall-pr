'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMailLetter, useMailOutbox } from '../../hooks/queries/useMailOutbox';
import {
  useClearSettledMailMutation,
  useRetryMailMutation,
} from '../../hooks/mutations/useMailMutations';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useLocale } from '../../hooks/useLocale';
import Skeleton from '../../components/ui/Skeleton';
import type { MailLogEntry } from '../../types/mail.types';
import styles from './AdminMailPage.module.scss';

type Tab = 'all' | 'queued' | 'failed' | 'sent';
const TABS: Tab[] = ['all', 'queued', 'failed', 'sent'];

function matchesTab(letter: MailLogEntry, tab: Tab): boolean {
  if (tab === 'all') return true;
  if (tab === 'queued') {
    return letter.status === 'pending' || letter.status === 'sending';
  }
  if (tab === 'failed') return letter.status === 'failed';
  return letter.status === 'sent' || letter.status === 'skipped';
}

function formatMoment(value: string, locale: 'ua' | 'en') {
  return new Date(value).toLocaleString(locale === 'en' ? 'en-GB' : 'uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminMailPage() {
  const { t } = useTranslation('admin');
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>('all');
  const [openLetterId, setOpenLetterId] = useState<number | null>(null);

  const { data: letters = [], isLoading } = useMailOutbox();
  const { data: openLetter } = useMailLetter(openLetterId);
  const retry = useRetryMailMutation();
  const clearSettled = useClearSettledMailMutation();
  const confirm = useConfirm();

  useEscapeKey(() => setOpenLetterId(null), openLetterId !== null);

  // What the row's timestamp should say depends on where the letter got to:
  // when it arrived, when it will be tried again, or nothing useful at all.
  const timingOf = (letter: MailLogEntry): string => {
    if (letter.status === 'sent' && letter.sentAt) {
      return t('mail.sentAt', { time: formatMoment(letter.sentAt, locale) });
    }
    if (letter.status === 'pending' && new Date(letter.nextAttemptAt) > new Date()) {
      return t('mail.nextAttempt', { time: formatMoment(letter.nextAttemptAt, locale) });
    }
    return t('mail.createdAt', { time: formatMoment(letter.createdAt, locale) });
  };

  const visible = letters.filter((letter) => matchesTab(letter, tab));
  const failedCount = letters.filter((letter) => letter.status === 'failed').length;
  const settledCount = letters.filter(
    (letter) => letter.status === 'sent' || letter.status === 'skipped',
  ).length;

  const handleClear = async () => {
    const ok = await confirm({
      title: t('mail.confirmClear.title'),
      message: t('mail.confirmClear.message'),
      confirmLabel: t('mail.confirmClear.confirmLabel'),
      danger: true,
    });
    if (ok) clearSettled.mutate();
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('mail.title')}</h1>
        {settledCount > 0 && (
          <button
            type="button"
            onClick={handleClear}
            disabled={clearSettled.isPending}
            className={styles.clearButton}
          >
            {t('mail.clearSent')}
          </button>
        )}
      </div>

      <p className={styles.intro}>
        {t('mail.intro')}
        {failedCount > 0 && (
          <>
            {' '}
            <strong className={styles.alarm}>
              {t('mail.undelivered', { count: failedCount })}
            </strong>
          </>
        )}
      </p>

      <div className={styles.tabs}>
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={tab === value ? styles.tabActive : styles.tab}
          >
            {t(`mail.tabs.${value}`)}
            {value === 'failed' && failedCount > 0 && ` (${failedCount})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className={styles.rowSkeleton} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className={styles.muted}>
          {tab === 'all' ? t('mail.emptyAll') : t('mail.emptyTab')}
        </p>
      ) : (
        <div className={styles.list}>
          {visible.map((letter) => (
            <div key={letter.id} className={styles.row}>
              <div className={styles.info}>
                <div className={styles.topLine}>
                  <span className={`${styles.badge} ${styles[letter.status]}`}>
                    {t(`mail.status.${letter.status}`)}
                  </span>
                  <span className={styles.kind}>
                    {t(`mail.kind.${letter.kind}`, { defaultValue: letter.kind })}
                  </span>
                  {letter.orderId && (
                    <span className={styles.order}>№{letter.orderId}</span>
                  )}
                </div>

                <div className={styles.subject}>{letter.subject}</div>

                <div className={styles.meta}>
                  <span className={styles.email}>{letter.toEmail}</span>
                  <span>· {timingOf(letter)}</span>
                  {letter.attempts > 0 && (
                    <span>{t('mail.attempts', { count: letter.attempts })}</span>
                  )}
                </div>

                {letter.lastError && (
                  <div className={styles.error}>{letter.lastError}</div>
                )}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={() => setOpenLetterId(letter.id)}
                  className={styles.viewButton}
                >
                  {t('mail.view')}
                </button>
                {letter.status !== 'sending' && (
                  <button
                    type="button"
                    onClick={() => retry.mutate(letter.id)}
                    disabled={retry.isPending}
                    className={styles.retryButton}
                  >
                    {letter.status === 'sent' ? t('mail.resend') : t('mail.retryNow')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {openLetterId !== null && (
        <div className={styles.overlay} onClick={() => setOpenLetterId(null)}>
          <div
            className={styles.preview}
            role="dialog"
            aria-modal="true"
            aria-label={t('mail.previewAria')}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.previewHeader}>
              <div className={styles.previewSubject}>
                {openLetter?.subject ?? t('mail.loading')}
              </div>
              <button
                type="button"
                onClick={() => setOpenLetterId(null)}
                className={styles.closeButton}
                aria-label={t('mail.closeAria')}
              >
                ✕
              </button>
            </div>

            {openLetter ? (
              // Rendered in a sandboxed iframe: it is a whole HTML document
              // with its own styling, and letting it into the page would drag
              // that styling in with it.
              <iframe
                title={t('mail.letterTitle')}
                sandbox=""
                srcDoc={openLetter.htmlBody}
                className={styles.previewFrame}
              />
            ) : (
              <Skeleton className={styles.previewFrame} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
