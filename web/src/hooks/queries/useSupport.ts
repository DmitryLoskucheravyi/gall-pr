import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supportService } from '../../api/support.api';
import { useSupportSocket } from '../useSupportSocket';
import type { SupportMessage } from '../../types/support.types';
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

// Unread messages waiting for the current customer. Shared by the header's
// support icon on phones and the floating launcher on wider screens, so the
// two can never disagree.
//
// Deliberately not GET /support/my-chat: that route marks the chat read as a
// side effect, so reading a count from it would clear the number it just
// reported.
export function useMyUnreadSupportCount(): number {
  const queryClient = useQueryClient();
  // Guests included — their chat is keyed by the guest token, so they have
  // unread replies to count like anyone else. Only the admin is excluded.
  const isCustomer = useAppSelector((state) => state.auth.user?.role !== 'ADMIN');
  // The chat page owns a socket of its own while it's open, and reading the
  // chat is what zeroes this — so stand down there.
  const { pathname } = useLocation();
  const onChat = pathname.startsWith('/support/chat');

  const { data } = useQuery({
    queryKey: queryKeys.support.myUnread(),
    queryFn: () => supportService.getMyUnreadCount(),
    // Refetched on the way back from the chat, where reading it just zeroed
    // the count server-side.
    enabled: isCustomer && !onChat,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  const socket = useSupportSocket(isCustomer && !onChat);

  // Keeps the badge live while the customer is elsewhere on the site.
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message: SupportMessage) => {
      if (message.senderRole !== 'ADMIN') return;
      queryClient.setQueryData<number>(
        queryKeys.support.myUnread(),
        (prev) => (prev ?? 0) + 1,
      );
    };

    socket.on('support:message', handleMessage);
    return () => {
      socket.off('support:message', handleMessage);
    };
  }, [socket, queryClient]);

  return data ?? 0;
}
