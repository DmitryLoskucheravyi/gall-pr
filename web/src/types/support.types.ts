export type SupportSenderRole = 'USER' | 'ADMIN';

export type SupportChatUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type SupportMessage = {
  id: number;
  chatId: number;
  senderId: number;
  senderRole: SupportSenderRole;
  content: string;
  createdAt: string;
  sender?: SupportChatUser;
};

export type SupportChat = {
  id: number;
  userId: number;
  user: SupportChatUser;
  lastMessageAt: string | null;
  unreadByAdmin: number;
  unreadByUser: number;
  createdAt: string;
  updatedAt: string;
};

export type SupportChatSummary = {
  id: number;
  user: SupportChatUser;
  lastMessage: { content: string; senderRole: SupportSenderRole } | null;
  lastMessageAt: string | null;
  unreadByAdmin: number;
  isOnline: boolean;
};

export type MyChatResponse = {
  chat: SupportChat;
  messages: SupportMessage[];
};
