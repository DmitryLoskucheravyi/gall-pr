import { Injectable } from '@nestjs/common';

// Keyed by chat, not by user: a guest has no user id, and the chat is the one
// handle both sides of a conversation always have.
@Injectable()
export class SupportPresenceService {
  private readonly onlineChatIds = new Set<number>();

  markOnline(chatId: number) {
    this.onlineChatIds.add(chatId);
  }

  markOffline(chatId: number) {
    this.onlineChatIds.delete(chatId);
  }

  isOnline(chatId: number): boolean {
    return this.onlineChatIds.has(chatId);
  }
}
