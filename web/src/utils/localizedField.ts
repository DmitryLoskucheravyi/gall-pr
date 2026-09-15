import type { Locale } from '../hooks/useLocale';

// Picks the English value of an admin-authored field when the site is in
// English and that field has actually been translated, falling back to the
// Ukrainian value otherwise — a row nobody has translated yet should never
// render blank. `field` is the Ukrainian column's name; the English one is
// always that name with `En` appended (`title` / `titleEn`), matching the
// entity/DTO convention on the backend.
export function pickLocale<T extends Record<string, unknown>, K extends keyof T & string>(
  entity: T,
  field: K,
  locale: Locale,
): T[K] {
  if (locale !== 'en') return entity[field];
  const enKey = `${field}En` as keyof T;
  const enValue = entity[enKey];
  return typeof enValue === 'string' && enValue.trim() !== ''
    ? (enValue as T[K])
    : entity[field];
}
