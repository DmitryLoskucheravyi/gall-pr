import type { TFunction } from 'i18next';

// One place for the wording, because it appears on the catalogue card, the
// gallery card and the painting's own page — and the three saying slightly
// different things would read as three different promises. Takes the
// caller's own `t` rather than calling useTranslation itself, since this is
// a plain function, not a hook — every caller already has one in scope.
export function editionLabel(isRepeatable: boolean, t: TFunction): string {
  return t(isRepeatable ? 'edition.repeatable' : 'edition.unique', { ns: 'common' });
}
