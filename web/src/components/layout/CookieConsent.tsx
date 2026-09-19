'use client';

import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readConsent, writeConsent } from '../../lib/consent';
import styles from './CookieConsent.module.scss';

// The cookie banner.
//
// Two categories, because two is what the site actually has: the things it
// cannot work without, and analytics, which does not exist yet and must not
// start existing without being asked. There is no "advertising" row because
// there is no advertising — a category listed but unused is a claim the site
// would have to defend for nothing.
//
// The necessary row has no switch, and says so rather than showing a disabled
// one turned on. A switch that cannot be moved is an invitation to try, and
// reads as a dark pattern even when the underlying fact is honest.
//
// "Only necessary" carries the same visual weight as "Accept all". Making
// refusal quieter than agreement is the thing regulators actually look for.
export default function CookieConsent() {
  const { t } = useTranslation('common');
  const detailsId = useId();

  // Nothing renders on the server, and nothing renders on the client's first
  // pass either — the decision lives in localStorage, which the server cannot
  // see, so drawing the banner before this effect runs would make the server
  // and client disagree and React would throw the whole tree away. Same
  // pattern as useReducedMotion, and for the same reason.
  const [visible, setVisible] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);

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

  if (!visible) return null;

  const decide = (allowAnalytics: boolean) => {
    writeConsent(allowAnalytics);
    setRevealed(false);
    // Let it travel back down before it leaves the tree.
    window.setTimeout(() => setVisible(false), 260);
  };

  return (
    <div
      className={styles.banner}
      data-revealed={revealed}
      role="region"
      aria-label={t('cookies.aria')}
    >
      <div className={styles.inner}>
        <div className={styles.body}>
          <h2 className={styles.title}>{t('cookies.title')}</h2>
          <p className={styles.text}>{t('cookies.text')}</p>

          <button
            type="button"
            className={styles.toggle}
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-controls={detailsId}
          >
            {expanded ? t('cookies.hideDetails') : t('cookies.showDetails')}
          </button>
        </div>

        {/* Kept mounted and hidden rather than unmounted, so the switch state
            survives opening and closing the panel. */}
        <div id={detailsId} className={styles.details} hidden={!expanded}>
          <div className={styles.category}>
            <div className={styles.categoryHead}>
              <span className={styles.categoryName}>
                {t('cookies.necessary.name')}
              </span>
              <span className={styles.always}>{t('cookies.necessary.always')}</span>
            </div>
            <p className={styles.categoryText}>{t('cookies.necessary.text')}</p>
          </div>

          <div className={styles.category}>
            <div className={styles.categoryHead}>
              <span className={styles.categoryName}>
                {t('cookies.analytics.name')}
              </span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.target.checked)}
                />
                <span className={styles.track} aria-hidden="true">
                  <span className={styles.thumb} />
                </span>
                <span className={styles.switchLabel}>
                  {analytics ? t('cookies.on') : t('cookies.off')}
                </span>
              </label>
            </div>
            <p className={styles.categoryText}>{t('cookies.analytics.text')}</p>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => decide(false)}
          >
            {t('cookies.onlyNecessary')}
          </button>

          {/* Only offered once the panel is open: with it closed there is no
              selection on screen to save, and a third button would just be a
              third way to say the same thing. */}
          {expanded && (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => decide(analytics)}
            >
              {t('cookies.saveChoice')}
            </button>
          )}

          <button
            type="button"
            className={styles.primary}
            onClick={() => decide(true)}
          >
            {t('cookies.acceptAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
