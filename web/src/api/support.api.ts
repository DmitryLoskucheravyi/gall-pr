import { api } from './client';
import type {
  MyChatResponse,
  SupportChatSummary,
  SupportMessage,
} from '../types/support.types';

class SupportService {
  async getMyChat(): Promise<MyChatResponse> {
    const response = await api.get('/support/my-chat');
    return response.data;
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
