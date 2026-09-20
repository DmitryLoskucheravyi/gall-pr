import type { Metadata } from 'next';
import Link from 'next/link';

import '@/styles/global.scss';
import styles from './not-found.module.scss';

// The site's 404, and the only page that carries its own <html>.
//
// Every route lives under app/[locale], so that layout is the root one — which
// leaves nothing above it to own <html> and <body>. Next looks for the global
// not-found boundary *here*, one level up, and finding no document to put it
// in was falling back to its own built-in page: "This page could not be
// found", in English, on a Ukrainian site, with no lang attribute, no chrome
// and no way back to the catalogue. A dead end on every stale link to a work
// that has sold.
//
// So this one supplies the document itself. That is allowed precisely because
// there is no app/layout.tsx above it, and it is what keeps <html lang> on the
// rest of the site tied to the locale in the URL instead of being frozen to
// one language by a root layout that cannot see the path.
//
// It deliberately does not pull in Providers, the chrome or i18next: this
// renders when routing has already failed, and every extra dependency is
// another thing that can fail with it. The copy is Ukrainian with an English
// line under it, because the locale is exactly what is not known here.

export const metadata: Metadata = {
  title: 'Сторінку не знайдено · Viktorumm',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        {/* Same pre-paint theme script as the locale layout: a dark-theme
            visitor should not be flashed white by the error page either. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=null;try{s=localStorage.getItem('gall_theme')}catch(e){}var d=s?s==='dark':window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')})()`,
          }}
        />
      </head>
      <body>
        <main className={styles.page}>
          <p className={styles.code}>404</p>
          <h1 className={styles.title}>Сторінку не знайдено</h1>
          <p className={styles.text}>
            Можливо, посилання застаріло або в адресі є помилка. Роботи нікуди
            не поділись — почніть із каталогу.
          </p>
          <p className={styles.english}>
            This page could not be found. The paintings are all still here.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/ua">
              На головну
            </Link>
            <Link className={styles.secondary} href="/ua/catalog">
              До каталогу
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
