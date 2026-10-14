import CookieSettingsButton from '../components/ui/CookieSettingsButton';
import type { LegalBlock, LegalDocument } from '../content/legal';
import type { Locale } from '../utils/locale';
import styles from './LegalPage.module.scss';

// Every legal page on the site: the offer, delivery and payment, returns, and
// the privacy statement. A Server Component — the text lives in content/ and
// nothing here needs the browser, except the one button that opens the cookie
// settings.
//
// They are one component rather than four because they are one document in
// four parts, and a reader who follows a cross-reference from one to the next
// should not be able to tell that they were written separately.
export default function LegalPage({
  document,
  locale,
  updatedAt,
}: {
  document: LegalDocument;
  locale: Locale;
  /** ISO date the text was last revised. */
  updatedAt: string;
}) {
  const content = document[locale];
  const updated = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(updatedAt));

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Viktorumm</p>
        <h1 className={styles.title}>{content.title}</h1>
        <p className={styles.updated}>
          {content.updatedLabel}: <time dateTime={updatedAt}>{updated}</time>
        </p>
        <p className={styles.intro}>{content.intro}</p>
        {content.translationNote ? (
          <p className={styles.note}>{content.translationNote}</p>
        ) : null}
      </header>

      <nav className={styles.toc} aria-label={content.tocTitle}>
        <h2 className={styles.tocTitle}>{content.tocTitle}</h2>
        <ol className={styles.tocList}>
          {content.sections.map((section) => {
            const { number, heading } = splitTitle(section.title);
            return (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  <span className={styles.tocNumber}>{number}</span>
                  {heading}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      {content.sections.map((section) => {
        const { number, heading } = splitTitle(section.title);
        return (
          <section key={section.id} id={section.id} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>{number}</span>
              {heading}
            </h2>
            <div className={styles.sectionBody}>
              {section.blocks.map((block, index) => (
                <Block
                  key={index}
                  block={block}
                  cookieSettingsLabel={content.cookieSettingsButton}
                />
              ))}
            </div>
          </section>
        );
      })}
    </article>
  );
}

// "3. Why we use it" → number and heading, so the number can sit in its own
// column. The content keeps the full string, which also reads correctly on
// its own wherever it is shown unsplit.
function splitTitle(title: string) {
  const match = /^(\d+)\.\s*(.*)$/.exec(title);
  return match
    ? { number: match[1].padStart(2, '0'), heading: match[2] }
    : { number: '', heading: title };
}

function Block({
  block,
  cookieSettingsLabel,
}: {
  block: LegalBlock;
  cookieSettingsLabel: string;
}) {
  switch (block.kind) {
    case 'p':
      return <p className={styles.paragraph}>{block.text}</p>;
    case 'list':
      return (
        <ul className={styles.list}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'table':
      return (
        // Scrolls sideways on a phone instead of squeezing four columns.
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th key={cell} scope="col">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) =>
                    index === 0 ? (
                      <th key={index} scope="row">
                        {block.code ? <code>{cell}</code> : cell}
                      </th>
                    ) : (
                      <td key={index}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'cookieSettings':
      return (
        <CookieSettingsButton className={styles.settingsButton}>
          {cookieSettingsLabel}
        </CookieSettingsButton>
      );
  }
}
