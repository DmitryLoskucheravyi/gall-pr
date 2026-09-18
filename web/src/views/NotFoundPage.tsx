'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from '../components/ui/LocalizedLink';
import styles from './NotFoundPage.module.scss';

// A page rather than a redirect.
//
// Every unmatched path used to bounce silently to the locale's home page,
// which meant a mistyped or long-dead link answered 200 and looked like it had
// worked — the visitor simply found themselves somewhere else with no
// explanation, and search engines indexed the home page under a hundred
// addresses. Saying "this isn't here" and offering somewhere to go is both
// kinder and more honest.
//
// The status itself is still 200: this is a static site with client-side
// routing and there is no server to set one. `noindex` is what carries the
// message to a crawler instead.
export default function NotFoundPage() {
  const { t } = useTranslation('common');

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);

    return () => {
      meta.remove();
    };
  }, []);

  return (
    <div className={styles.wrap}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{t('notFound.title')}</h1>
      <p className={styles.text}>{t('notFound.text')}</p>

      <div className={styles.actions}>
        <Link to="/" className={styles.primary}>
          {t('notFound.home')}
        </Link>
        <Link to="/catalog" className={styles.secondary}>
          {t('notFound.catalog')}
        </Link>
      </div>
    </div>
  );
}
