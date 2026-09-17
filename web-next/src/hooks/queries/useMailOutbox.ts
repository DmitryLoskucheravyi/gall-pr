import { useQuery } from '@tanstack/react-query';

import { mailService } from '../../api/mail.api';
import { queryKeys } from '../../lib/queryKeys';
import type { MailStatus } from '../../types/mail.types';

// Letters move on their own — a retry can fire minutes after the page was
// opened — so the log refreshes itself rather than showing a stale queue.
export function useMailOutbox(status?: MailStatus) {
  return useQuery({
    queryKey: queryKeys.mail.outbox(status ?? 'all'),
    queryFn: () => mailService.getOutbox(status),
    staleTime: 5_000,
    refetchInterval: 30_000,
  });
}

export function useMailLetter(id: number | null) {
  return useQuery({
    queryKey: queryKeys.mail.letter(id ?? 0),
    queryFn: () => mailService.getLetter(id as number),
    enabled: id !== null,
  });
}
