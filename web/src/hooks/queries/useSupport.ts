import { useQuery } from '@tanstack/react-query';

import { supportService } from '../../api/support.api';
import { queryKeys } from '../../lib/queryKeys';
import type { SupportChatSummary } from '../../types/support.types';
import { useAppSelector } from '../../store/hooks';

function sumUnread(chats: SupportChatSummary[]) {
  return chats.reduce((sum, chat) => sum + chat.unreadByAdmin, 0);
}

export function useAdminUnreadSupportCount(): number {
  const isAdmin = useAppSelector((state) => state.auth.user?.role === 'ADMIN');

  const { data } = useQuery({
    queryKey: queryKeys.support.adminChats(),
    queryFn: () => supportService.getChats(),
    enabled: isAdmin,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    select: sumUnread,
  });

  return data ?? 0;
}
