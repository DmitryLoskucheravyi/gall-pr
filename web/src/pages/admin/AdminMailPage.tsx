import { useState } from 'react';

import { useMailLetter, useMailOutbox } from '../../hooks/queries/useMailOutbox';
import {
  useClearSettledMailMutation,
  useRetryMailMutation,
} from '../../hooks/mutations/useMailMutations';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import Skeleton from '../../components/ui/Skeleton';
import type { MailKind, MailLogEntry, MailStatus } from '../../types/mail.types';
import styles from './AdminMailPage.module.scss';

const KIND_LABEL: Record<MailKind, string> = {
  order_placed: 'Замовлення прийнято',
  payment_proof_received: 'Скріншот оплати',
  payment_confirmed: 'Оплату підтверджено',
  payment_failed: 'Оплата не пройшла',
  order_shipped: 'Відправлено',
  order_completed: 'Подяка за замовлення',
  order_cancelled: 'Скасовано',
  order_apology: 'Вибачення',
};

const STATUS_LABEL: Record<MailStatus, string> = {
  pending: 'У черзі',
  sending: 'Надсилається',
  sent: 'Надіслано',
  failed: 'Помилка',
  skipped: 'Пропущено',
};

type Tab = 'all' | 'queued' | 'failed' | 'sent';

const TAB_LABEL: Record<Tab, string> = {
  all: 'Усі',
  queued: 'У черзі',
  failed: 'Помилки',
  sent: 'Надіслані',
};

function matchesTab(letter: MailLogEntry, tab: Tab): boolean {
  if (tab === 'all') return true;
  if (tab === 'queued') {
    return letter.status === 'pending' || letter.status === 'sending';
  }
  if (tab === 'failed') return letter.status === 'failed';
  return letter.status === 'sent' || letter.status === 'skipped';
}

function formatMoment(value: string) {
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// What the row's timestamp should say depends on where the letter got to:
// when it arrived, when it will be tried again, or nothing useful at all.
function timingOf(letter: MailLogEntry): string {
  if (letter.status === 'sent' && letter.sentAt) {
    return `надіслано ${formatMoment(letter.sentAt)}`;
  }
  if (letter.status === 'pending' && new Date(letter.nextAttemptAt) > new Date()) {
    return `наступна спроба ${formatMoment(letter.nextAttemptAt)}`;
  }
  return `створено ${formatMoment(letter.createdAt)}`;
}

export default function AdminMailPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [openLetterId, setOpenLetterId] = useState<number | null>(null);

  const { data: letters = [], isLoading } = useMailOutbox();
  const { data: openLetter } = useMailLetter(openLetterId);
  const retry = useRetryMailMutation();
  const clearSettled = useClearSettledMailMutation();
  const confirm = useConfirm();

  useEscapeKey(() => setOpenLetterId(null), openLetterId !== null);

  const visible = letters.filter((letter) => matchesTab(letter, tab));
  const failedCount = letters.filter((letter) => letter.status === 'failed').length;
  const settledCount = letters.filter(
    (letter) => letter.status === 'sent' || letter.status === 'skipped',
  ).length;

  const handleClear = async () => {
    const ok = await confirm({
      title: 'Очистити журнал?',
      message:
        'Записи про надіслані та пропущені листи буде видалено. Листи в черзі й помилки залишаться.',
      confirmLabel: 'Очистити',
      danger: true,
    });
    if (ok) clearSettled.mutate();
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Журнал листів</h1>
        {settledCount > 0 && (
          <button
            type="button"
            onClick={handleClear}
            disabled={clearSettled.isPending}
            className={styles.clearButton}
          >
            Очистити надіслані
          </button>
        )}
      </div>

      <p className={styles.intro}>
        Кожен лист спершу записується сюди, і лише потім вирушає. Якщо пошта
        недоступна, спроби повторюються: за 1 хв, 5 хв, 15 хв, 1 год і 6 год.
        {failedCount > 0 && (
          <>
            {' '}
            <strong className={styles.alarm}>
              Недоставлених: {failedCount}.
            </strong>
          </>
        )}
      </p>

      <div className={styles.tabs}>
        {(Object.keys(TAB_LABEL) as Tab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={tab === value ? styles.tabActive : styles.tab}
          >
            {TAB_LABEL[value]}
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
          {tab === 'all' ? 'Листів ще не було' : 'У цій вкладці порожньо'}
        </p>
      ) : (
        <div className={styles.list}>
          {visible.map((letter) => (
            <div key={letter.id} className={styles.row}>
              <div className={styles.info}>
                <div className={styles.topLine}>
                  <span className={`${styles.badge} ${styles[letter.status]}`}>
                    {STATUS_LABEL[letter.status]}
                  </span>
                  <span className={styles.kind}>
                    {KIND_LABEL[letter.kind] ?? letter.kind}
                  </span>
                  {letter.orderId && (
                    <span className={styles.order}>№{letter.orderId}</span>
                  )}
                </div>

                <div className={styles.subject}>{letter.subject}</div>

                <div className={styles.meta}>
                  <span className={styles.email}>{letter.toEmail}</span>
                  <span>· {timingOf(letter)}</span>
                  {letter.attempts > 0 && <span>· спроб: {letter.attempts}</span>}
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
                  Показати
                </button>
                {letter.status !== 'sending' && (
                  <button
                    type="button"
                    onClick={() => retry.mutate(letter.id)}
                    disabled={retry.isPending}
                    className={styles.retryButton}
                  >
                    {letter.status === 'sent' ? 'Надіслати ще раз' : 'Спробувати зараз'}
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
            aria-label="Перегляд листа"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.previewHeader}>
              <div className={styles.previewSubject}>
                {openLetter?.subject ?? 'Завантаження…'}
              </div>
              <button
                type="button"
                onClick={() => setOpenLetterId(null)}
                className={styles.closeButton}
                aria-label="Закрити"
              >
                ✕
              </button>
            </div>

            {openLetter ? (
              // Rendered in a sandboxed iframe: it is a whole HTML document
              // with its own styling, and letting it into the page would drag
              // that styling in with it.
              <iframe
                title="Лист"
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
