export type SupportSenderRole = 'USER' | 'ADMIN';

export type SupportChatUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

// senderId/user are null for a guest: the chat belongs to a browser rather
// than an account, so there is no person record behind it.
export type SupportMessage = {
  id: number;
  chatId: number;
  senderId: number | null;
  senderRole: SupportSenderRole;
  content: string;
  createdAt: string;
  sender?: SupportChatUser | null;
};

export type SupportChat = {
  id: number;
  userId: number | null;
  user: SupportChatUser | null;
  lastMessageAt: string | null;
  unreadByAdmin: number;
  unreadByUser: number;
  createdAt: string;
  updatedAt: string;
};

export type SupportChatSummary = {
  id: number;
  user: SupportChatUser | null;
  isGuest: boolean;
  lastMessage: { content: string; senderRole: SupportSenderRole } | null;
  lastMessageAt: string | null;
  unreadByAdmin: number;
  isOnline: boolean;
};

// chat is null until the visitor has actually written something — the thread
// is created by the first message, not by opening the page.
export type MyChatResponse = {
  chat: SupportChat | null;
  messages: SupportMessage[];
};
