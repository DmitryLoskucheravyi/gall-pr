import { api } from './client';
import type {
  MyChatResponse,
  SupportChatSummary,
  SupportMessage,
} from '../types/support.types';

class SupportService {
  // Note this marks the chat read server-side. For a plain count, use
  // getMyUnreadCount instead.
  async getMyChat(): Promise<MyChatResponse> {
    const response = await api.get('/support/my-chat');
    return response.data;
  }

  async getMyUnreadCount(): Promise<number> {
    const response = await api.get('/support/my-chat/unread');
    return response.data.unread as number;
  }

  async getChats(): Promise<SupportChatSummary[]> {
    const response = await api.get('/support/chats');
    return response.data;
  }

  async getChatMessages(chatId: number): Promise<SupportMessage[]> {
    const response = await api.get(`/support/chats/${chatId}/messages`);
    return response.data;
  }
}

export const supportService = new SupportService();
