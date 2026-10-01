'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  COOKIE_SETTINGS_EVENT,
  readConsent,
  writeConsent,
} from '../../lib/consent';
import { LocalizedLink as Link } from '../ui/LocalizedLink';
import styles from './CookieConsent.module.scss';

// The cookie banner and the settings panel it opens.
//
// The banner is one sentence, a link to the privacy statement and three
// buttons. "Decline" records "necessary only" — the session and cart cannot be
// switched off — and "Accept" also allows analytics once it exists. Decline
// carries the same visual weight as Accept: making refusal quieter than
// agreement is the thing regulators actually look for.
//
// The settings panel is reachable after the banner is gone too (the footer and
// the privacy page call openCookieSettings), because withdrawing consent has
// to be as easy as giving it.
export default function CookieConsent() {
  const { t } = useTranslation('common');

  // Nothing renders on the server, and nothing renders on the client's first
  // pass either — the decision lives in localStorage, which the server cannot
  // see, so drawing the banner before this effect runs would make the server
  // and client disagree and React would throw the whole tree away. Same
  // pattern as useReducedMotion, and for the same reason.
  const [visible, setVisible] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (readConsent()) return;

    // The linter would rather this were an initial state value. It cannot be:
    // localStorage is exactly the "external system" the rule's own help text
    // carves out, and deriving it during render is what puts a banner in the
    // server's HTML that the client then disagrees with.
    // oxlint-disable-next-line react/set-state-in-effect
    setVisible(true);

    // Two frames: the first paints the banner off-screen, the second moves it,
    // so the transition has somewhere to travel from. Setting both in one pass
    // would land it in place with nothing to animate.
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setRevealed(true)),
    );

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener(COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, open);
  }, []);

  const decide = (allowAnalytics: boolean) => {
    writeConsent(allowAnalytics);
    setSettingsOpen(false);
    setRevealed(false);
    // Let it travel back down before it leaves the tree.
    window.setTimeout(() => setVisible(false), 260);
  };

  return (
    <>
      {visible && (
        <div
          className={styles.banner}
          data-revealed={revealed}
          role="region"
          aria-label={t('cookies.aria')}
        >
          <div className={styles.card}>
            <div className={styles.brand}>
              <img src="/favicon.svg" alt="" className={styles.logo} />
              <span className={styles.wordmark}>Viktorumm</span>
            </div>

            <p className={styles.text}>
              {t('cookies.text')}{' '}
              <Link to="/privacy" className={styles.policyLink}>
                {t('cookies.policyLink')}
              </Link>
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.secondary} ${styles.settingsButton}`}
                onClick={() => setSettingsOpen(true)}
              >
                {t('cookies.settings')}
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => decide(false)}
              >
                {t('cookies.decline')}
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={() => decide(true)}
              >
                {t('cookies.accept')}
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <CookieSettings
          onClose={() => setSettingsOpen(false)}
          onConfirm={decide}
        />
      )}
    </>
  );
}

// The settings panel: a modal <dialog> sliding in from the right. A native
// modal dialog brings the focus trap, Esc to close and the inert page behind
// it for free, all of which a hand-rolled overlay gets subtly wrong.
function CookieSettings({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (allowAnalytics: boolean) => void;
}) {
  const { t } = useTranslation('common');
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Starts from the visitor's current decision, so reopening the panel shows
  // what they chose last time rather than resetting it.
  const [analytics, setAnalytics] = useState(
    () => readConsent()?.analytics ?? false,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    // The page behind a modal shouldn't scroll under the visitor's wheel.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      // Esc fires `cancel`; letting the dialog close itself would leave the
      // React state saying it is still open.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.panel}>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label={t('cookies.close')}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <h2 id={titleId} className={styles.panelTitle}>
          {t('cookies.preferencesTitle')}
        </h2>
        <p className={styles.panelText}>{t('cookies.preferencesText')}</p>
        <Link to="/privacy" className={styles.panelLink} onClick={onClose}>
          {t('cookies.preferencesLink')}
        </Link>

        <h3 className={styles.sectionTitle}>{t('cookies.yourSettings')}</h3>

        <div className={styles.categories}>
          <details className={styles.category}>
            <summary className={styles.categoryHead}>
              <span className={styles.plus} aria-hidden="true" />
              <span className={styles.categoryName}>
                {t('cookies.necessary.name')}
              </span>
              <span className={styles.always}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m5 12.5 4.5 4.5L19 7.5"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t('cookies.necessary.always')}
              </span>
            </summary>
            <p className={styles.categoryText}>{t('cookies.necessary.text')}</p>
          </details>

          <details className={styles.category}>
            <summary className={styles.categoryHead}>
              <span className={styles.plus} aria-hidden="true" />
              <span className={styles.categoryName}>
                {t('cookies.analytics.name')}
              </span>
              {/* Inside the summary so it sits on the row, but a click on it
                  must flip the switch, not also open the section. */}
              <label
                className={styles.switch}
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.target.checked)}
                  aria-label={t('cookies.analytics.name')}
                />
                <span className={styles.track} aria-hidden="true">
                  <span className={styles.thumb} />
                </span>
              </label>
            </summary>
            <p className={styles.categoryText}>{t('cookies.analytics.text')}</p>
          </details>
        </div>

        <div className={styles.panelFooter}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => onConfirm(analytics)}
          >
            {t('cookies.confirm')}
          </button>
        </div>
      </div>
    </dialog>
  );
}
