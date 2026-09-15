import type { TFunction } from 'i18next';
import type { Locale } from '../hooks/useLocale';

// Backed by Intl.PluralRules rather than a hand-written mod10/mod100 table,
// because the old table was Ukrainian-specific (1 день, 2–4 дні, 5+ днів,
// with the teens always taking the third form) and quietly wrong for
// English once a site had more than one language — it called 21 "one" the
// same way it calls 1 "one", where English wants "21 participants".
// Intl.PluralRules knows each language's actual categories.
type Forms = { one: string; few?: string; many?: string; other: string };

export function plural(n: number, locale: Locale, forms: Forms): string {
  const category = new Intl.PluralRules(locale === 'ua' ? 'uk' : 'en').select(n);
  return forms[category as keyof Forms] ?? forms.other;
}

// A translation key whose value is a {one, few?, many?, other} object rather
// than a plain string — i18next's own typings don't carry that shape
// through `returnObjects`, so this is the one place that cast lives instead
// of at every call site.
export function pluralForms(t: TFunction, key: string): Forms {
  return t(key, { returnObjects: true }) as unknown as Forms;
}
