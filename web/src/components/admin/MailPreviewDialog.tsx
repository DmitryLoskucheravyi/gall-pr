'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { useConfirm } from '../ui/ConfirmDialog';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { apiErrorMessage } from '../../utils/apiError';
import Skeleton from '../ui/Skeleton';
import type { ComposedLetter, MailEdits } from '../../types/mail.types';
import styles from './MailPreviewDialog.module.scss';

// Only in edit mode, and only inside the frame: a hairline under whatever the
// pointer is over says "this is text you can change" without dressing the
// letter in anything the customer will receive. It lives in <head>, and only
// <body> is sent, so it never leaves this dialog.
const EDIT_STYLE = `
  body { margin: 0; cursor: text; }
  body :is(p, h1, div, span, strong, a, li):hover {
    outline: 1px dashed rgba(85, 17, 38, 0.45);
    outline-offset: 2px;
  }
  *:focus { outline: none; }
  a { cursor: text; }
`;

type Props = {
  // Changes with the order and the kind of letter, so a second dialog never
  // shows the first one's cached draft.
  queryKey: readonly unknown[];
  load: () => Promise<ComposedLetter>;
  send: (edits: MailEdits) => Promise<unknown>;
  onClose: () => void;
};

// "What will the customer actually get?" — the real letter, composed by the
// server from the same template and data the send uses, shown before it goes.
// The subject is a field; the body is the letter itself, put into design mode
// so a click on any line edits it in place. Whatever is on screen when Send is
// pressed is what is sent; an untouched preview sends the template unchanged.
export default function MailPreviewDialog({
  queryKey,
  load,
  send,
  onClose,
}: Props) {
  const { t } = useTranslation('admin');
  const confirm = useConfirm();
  const frameRef = useRef<HTMLIFrameElement>(null);
  // Escape reaches this dialog while its own "discard?" question is open;
  // without this a second press would stack a second question on the first.
  const askingRef = useRef(false);

  const letter = useQuery({
    queryKey,
    queryFn: load,
    // A draft, not data: never refetched under the admin's hands.
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

  const [subject, setSubject] = useState<string | null>(null);
  const [bodyEdited, setBodyEdited] = useState(false);
  // Bumping this remounts the frame from the template — "undo my edits".
  const [frameKey, setFrameKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSubject = subject ?? letter.data?.subject ?? '';
  const subjectEdited =
    subject !== null && subject.trim() !== (letter.data?.subject ?? '');
  const dirty = bodyEdited || subjectEdited;

  const handleFrameLoad = () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;

    const style = doc.createElement('style');
    style.textContent = EDIT_STYLE;
    doc.head.appendChild(style);

    doc.designMode = 'on';
    doc.addEventListener('input', () => setBodyEdited(true));
  };

  const requestClose = useCallback(async () => {
    if (sending || askingRef.current) return;
    if (dirty) {
      askingRef.current = true;
      const ok = await confirm({
        title: t('mailPreview.discard.title'),
        message: t('mailPreview.discard.message'),
        confirmLabel: t('mailPreview.discard.confirmLabel'),
        danger: true,
      }).finally(() => {
        askingRef.current = false;
      });
      if (!ok) return;
    }
    onClose();
  }, [confirm, dirty, onClose, sending, t]);

  useEscapeKey(() => void requestClose(), true);

  const handleReset = () => {
    setSubject(null);
    setBodyEdited(false);
    setFrameKey((key) => key + 1);
  };

  const handleSend = async () => {
    const edits: MailEdits = {};
    if (subjectEdited) edits.subject = currentSubject.trim();
    if (bodyEdited) {
      const html = frameRef.current?.contentDocument?.body.innerHTML.trim();
      if (html) edits.html = html;
    }

    setError(null);
    setSending(true);
    try {
      await send(edits);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, t('mailPreview.sendError')));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={() => void requestClose()}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t('mailPreview.aria')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.headerText}>
            <p className={styles.eyebrow}>{t('mailPreview.title')}</p>
            {letter.data && (
              <p className={styles.to}>
                {t('mailPreview.to')} <strong>{letter.data.to}</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void requestClose()}
            className={styles.closeButton}
            aria-label={t('mailPreview.close')}
          >
            ✕
          </button>
        </div>

        {letter.isError ? (
          <p className={styles.loadError}>
            {apiErrorMessage(letter.error, t('mailPreview.loadError'))}
          </p>
        ) : !letter.data ? (
          <Skeleton className={styles.frame} />
        ) : (
          <>
            <label className={styles.subjectField}>
              <span className={styles.subjectLabel}>
                {t('mailPreview.subject')}
              </span>
              <input
                value={currentSubject}
                maxLength={300}
                onChange={(event) => setSubject(event.target.value)}
                className={styles.subjectInput}
              />
            </label>

            <p className={styles.hint}>{t('mailPreview.hint')}</p>

            {/* allow-same-origin and nothing else: this page needs to reach
                into the document to edit it, and the letter never gets to
                run a script of its own. */}
            <iframe
              key={frameKey}
              ref={frameRef}
              title={t('mailPreview.frameTitle')}
              sandbox="allow-same-origin"
              srcDoc={`<!doctype html><html><head><meta charset="utf-8"></head><body>${letter.data.html}</body></html>`}
              onLoad={handleFrameLoad}
              className={styles.frame}
            />
          </>
        )}

        <div className={styles.footer}>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            {dirty && (
              <button
                type="button"
                onClick={handleReset}
                disabled={sending}
                className={styles.resetButton}
              >
                {t('mailPreview.reset')}
              </button>
            )}
            <span className={styles.spacer} />
            <button
              type="button"
              onClick={() => void requestClose()}
              disabled={sending}
              className={styles.cancelButton}
            >
              {t('mailPreview.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !letter.data || !currentSubject.trim()}
              className={styles.sendButton}
            >
              {sending
                ? t('mailPreview.sending')
                : dirty
                  ? t('mailPreview.sendEdited')
                  : t('mailPreview.send')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
