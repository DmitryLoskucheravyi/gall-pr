import { useQuery } from '@tanstack/react-query';

import { faqService } from '../../api/faq.api';
import { queryKeys } from '../../lib/queryKeys';
import { sortFaqEntries } from '../../utils/sortFaqEntries';
import type { FaqEntry } from '../../types/faq.types';

const EMPTY_FAQ_ENTRIES: FaqEntry[] = [];

export function useFaq() {
  return useQuery({
    queryKey: queryKeys.faq.all,
    queryFn: () => faqService.getFaq(),
    staleTime: 60_000,
  });
}

// select is only re-run when `data` itself changes, so this stays a stable
// reference while loaded. The `?? []` fallback used to undo that stability
// by minting a new empty array every render while data was still
// undefined, which fed a useEffect dependency elsewhere into a render loop.
export function useFaqEntries(): FaqEntry[] {
  const { data } = useQuery({
    queryKey: queryKeys.faq.all,
    queryFn: () => faqService.getFaq(),
    staleTime: 60_000,
    select: sortFaqEntries,
  });

  return data ?? EMPTY_FAQ_ENTRIES;
}
