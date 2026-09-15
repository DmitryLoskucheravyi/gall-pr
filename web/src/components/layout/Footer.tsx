import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link, LocalizedNavLink as NavLink } from '../ui/LocalizedLink';
import { useAuthorName, useSupportTelegramUrl } from '../../hooks/queries/useSettings';
import { useAppSelector } from '../../store/hooks';
import { safeExternalUrl } from '../../utils/safeUrl';
import styles from './Footer.module.scss';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.link} ${isActive ? styles.active : ''}`;

type Props = {
  // Where scrolling past this footer leads, if anywhere — see
  // useScrollContinue. Undefined on every page that isn't part of that walk,
  // and the bar below simply doesn't render.
  continueTo?: string;
  continueProgress?: number;
};

export default function Footer({ continueTo, continueProgress = 0 }: Props) {
  const { t } = useTranslation('footer');
  const authorName = useAuthorName();
  const supportTelegramUrl = useSupportTelegramUrl();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {/* Logo on one side, the way on to the next page (if there is one —
            see useScrollContinue) on the other, opposite it. */}
        <div className={styles.top}>
          <Link to="/" className={styles.logo}>
            <span className={styles.wordmark}>Viktorumm</span>
          </Link>

          {continueTo && (
            <Link
              to={continueTo}
              className={styles.continue}
              style={{ '--progress': continueProgress } as CSSProperties}
            >
              <span className={styles.continueLabel}>{t('continueLabel')}</span>
              <span className={styles.continueTrack} aria-hidden="true">
                <span className={styles.continueFill} />
              </span>
              <svg
                className={styles.continueArrow}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}
        </div>

        <div className={styles.main}>
          <div className={styles.brand}>
            <p className={styles.tagline}>
              {authorName
                ? t('taglineWithAuthor', { author: authorName })
                : t('taglineNoAuthor')}
            </p>
          </div>

          <div className={styles.links}>
            <nav className={styles.column}>
              <h3 className={styles.columnTitle}>{t('columns.navigation')}</h3>
              <NavLink to="/" end className={linkClass}>
                {t('nav.home')}
              </NavLink>
              <NavLink to="/catalog" className={linkClass}>
                {t('nav.catalog')}
              </NavLink>
              <NavLink to="/gallery" className={linkClass}>
                {t('nav.gallery')}
              </NavLink>
            </nav>

            <nav className={styles.column}>
              <h3 className={styles.columnTitle}>{t('columns.account')}</h3>
              <NavLink to="/favorites" className={linkClass}>
                {t('nav.favorites')}
              </NavLink>
              <NavLink to="/cart" className={linkClass}>
                {t('nav.cart')}
              </NavLink>
              <NavLink to="/orders" className={linkClass}>
                {t('nav.orders')}
              </NavLink>
              <NavLink to="/profile" className={linkClass}>
                {t('nav.profile')}
              </NavLink>
            </nav>

            <nav className={styles.column}>
              <h3 className={styles.columnTitle}>{t('columns.help')}</h3>
              <NavLink to="/support" className={linkClass}>
                {t('nav.support')}
              </NavLink>
              {supportTelegramUrl && (
                <a
                  href={safeExternalUrl(supportTelegramUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.link}
                >
                  {t('nav.telegramBot')}
                </a>
              )}
              {!isAuthenticated && (
                <>
                  <NavLink to="/login" className={linkClass}>
                    {t('nav.login')}
                  </NavLink>
                  <NavLink to="/register" className={linkClass}>
                    {t('nav.register')}
                  </NavLink>
                </>
              )}
            </nav>
          </div>
        </div>

        <div className={styles.info}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('info.paymentLabel')}</span>
            <span className={styles.infoValue}>{t('info.paymentValue')}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('info.deliveryLabel')}</span>
            <span className={styles.infoValue}>{t('info.deliveryValue')}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('info.guaranteeLabel')}</span>
            <span className={styles.infoValue}>{t('info.guaranteeValue')}</span>
          </div>
        </div>

        <div className={styles.bottom}>
          <span className={styles.copyright}>
            {t('copyright', { year, author: authorName || 'Viktorumm' })}
          </span>
          <button
            type="button"
            onClick={scrollToTop}
            aria-label={t('toTopAria')}
            className={styles.topButton}
          >
            {t('toTop')}
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M6 15.5 12 9l6 6.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
