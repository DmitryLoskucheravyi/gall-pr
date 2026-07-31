import type { FaqEntry, FaqMap } from '../types/faq.types';

export function sortFaqEntries(faq: FaqMap): FaqEntry[] {
  return Object.entries(faq)
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => a.order - b.order);
}
