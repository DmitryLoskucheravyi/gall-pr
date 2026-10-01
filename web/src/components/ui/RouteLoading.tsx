'use client';

import { useTranslation } from 'react-i18next';

import Loader from './Loader';
import styles from './RouteLoading.module.scss';

// What a route's loading.tsx renders while its page is on the way: the
// header and footer stay, and the space between them holds a spinner, so a
// click on "Каталог" answers at once instead of appearing to do nothing.
//
// Only for routes that never call notFound(). A loading.tsx is a Suspense
// boundary around its page, and a boundary above a page that 404s lets the
// shell go out with 200 before the page can say otherwise — the soft 404 the
// shared boundary in Layout.tsx was removed for. painting/[id] must not get one.
export default function RouteLoading() {
  const { t } = useTranslation('common');

  return (
    <div className={styles.wrap}>
      <Loader label={t('loading')} />
    </div>
  );
}
