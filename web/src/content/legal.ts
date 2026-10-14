import type { Locale } from '../utils/locale';

// The shape every legal page on the site is written in, and the one place the
// operator's own details are kept.
//
// There are four of these pages — the offer, delivery and payment, returns,
// and the privacy statement — and an acquirer expects to find all four before
// it will take a merchant on. They are all long, all revised as a whole, and
// all rendered by views/LegalPage.tsx, so they share a shape rather than each
// inventing one.
//
// Not i18n strings: a paragraph of a contract is not a label, nothing
// interpolates into it at runtime, and splitting a contract across a
// key-value file is how clauses go missing in translation.

// The operator's details are placeholders until the sole proprietorship is
// registered. Fill them in here once — every mention across all four pages
// reads from this object, including the requisites table at the foot of the
// offer.
export const OPERATOR = {
  name: { ua: '[ПІБ / назва ФОП]', en: '[Full name / sole proprietor]' },
  taxId: '[ІПН / РНОКПП]',
  registry: '[запис в ЄДР]',
  address: { ua: '[юридична адреса]', en: '[registered address]' },
  iban: '[IBAN]',
  taxation: {
    ua: '[єдиний податок, група __]',
    en: '[single tax, group __]',
  },
  phone: '[телефон]',
  email: '[email]',
  site: 'viktorumm.com',
};

export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  // `code` sets the first column as code — for names a reader may need to
  // find in their browser verbatim, like the cookie table's. Not for labels.
  | { kind: 'table'; head: string[]; rows: string[][]; code?: boolean }
  // Only the privacy statement uses this one: the button that reopens the
  // cookie dialogue has to sit inside the text that explains it.
  | { kind: 'cookieSettings' };

export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };

export type LegalContent = {
  title: string;
  description: string;
  updatedLabel: string;
  intro: string;
  tocTitle: string;
  // Shown above the text on the English pages: the Ukrainian version is the
  // one that governs, and saying so is what keeps a courtesy translation from
  // being read as a second contract.
  translationNote?: string;
  cookieSettingsButton: string;
  sections: LegalSection[];
};

export type LegalDocument = Record<Locale, LegalContent>;

export const p = (text: string): LegalBlock => ({ kind: 'p', text });
export const list = (...items: string[]): LegalBlock => ({ kind: 'list', items });
export const table = (head: string[], rows: string[][]): LegalBlock => ({
  kind: 'table',
  head,
  rows,
});

export const TRANSLATION_NOTE_EN =
  'This is an unofficial translation, provided for convenience. The Ukrainian text of this document is the one that governs the contract; in any discrepancy, the Ukrainian version prevails.';
