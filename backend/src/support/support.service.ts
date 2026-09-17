import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';

import { SupportChat } from './entities/support-chat.entity';
import { SupportMessage } from './entities/support-message.entity';
import { UserRole } from '../users/entities/user.entity';
import { SupportPresenceService } from './support-presence.service';
import type { Identity } from '../common/identity.util';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportChat)
    private readonly chatsRepository: Repository<SupportChat>,

    @InjectRepository(SupportMessage)
    private readonly messagesRepository: Repository<SupportMessage>,

    private readonly presence: SupportPresenceService,
  ) {}

  private identityWhere(identity: Identity) {
    return 'userId' in identity
      ? { userId: identity.userId }
      : { guestToken: identity.guestToken };
  }

  // Lookup without side effects. Everything that merely looks at the chat —
  // opening the page, polling the unread badge — goes through this, so simply
  // visiting the site doesn't leave a chat behind.
  async findChat(identity: Identity): Promise<SupportChat | null> {
    return this.chatsRepository.findOne({
      where: this.identityWhere(identity),
    });
  }

  // One chat per identity, created when someone actually writes. A guest
  // identity is the browser's guest token, so the same browser lands in the
  // same thread days later without an account ever being involved.
  // Check-then-insert, so two first messages arriving together can both find
  // nothing and both insert. user_id has a unique index that turns the loser of
  // that race into an error; guest_token only recently got one (see
  // temp/support_guest_chat_unique.sql), and this must not depend on whether
  // that migration has been applied yet — so the insert is retried through a
  // re-read either way. Worst case without the index, the re-read finds the
  // other row and we simply don't create a second.
  async getOrCreateChat(identity: Identity): Promise<SupportChat> {
    const existing = await this.findChat(identity);
    if (existing) return existing;

    try {
      return await this.chatsRepository.save(
        this.chatsRepository.create(this.identityWhere(identity)),
      );
    } catch (error) {
      const raced = await this.findChat(identity);
      if (raced) return raced;

      throw error;
    }
  }

  // Called when a guest signs in or registers: their thread follows them into
  // the account instead of being stranded behind a token the site stops
  // sending. If they already had a chat, the guest one is left alone rather
  // than merged — splicing two conversations together by timestamp would read
  // as one confusing thread to everybody.
  async claimGuestChat(userId: number, guestToken: string) {
    const guestChat = await this.chatsRepository.findOne({
      where: { guestToken },
    });
    if (!guestChat) return { message: 'Немає що перенести' };

    const ownChat = await this.chatsRepository.findOne({ where: { userId } });
    if (ownChat) return { message: 'У вас уже є розмова з підтримкою' };

    guestChat.userId = userId;
    guestChat.guestToken = null;
    await this.chatsRepository.save(guestChat);

    return { message: 'Розмову перенесено в акаунт' };
  }

  async getChatById(chatId: number): Promise<SupportChat> {
    const chat = await this.chatsRepository.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Розмову не знайдено');
    return chat;
  }

  async getMessages(chatId: number): Promise<SupportMessage[]> {
    return this.messagesRepository.find({
      where: { chatId },
      order: { createdAt: 'ASC' },
    });
  }

  // Only conversations that exist as conversations. A chat row can outlive its
  // messages — someone wrote once and the thread was cleared, or a row was left
  // over from when merely opening the site created one — and an inbox full of
  // people who never said anything is an inbox nobody trusts.
  async getAdminChatList() {
    const chats = await this.chatsRepository.find({
      where: { lastMessageAt: Not(IsNull()) },
      order: { lastMessageAt: 'DESC' },
    });

    // One query for every thread's latest message instead of one query per
    // thread. The inbox is the admin's landing page and it grows with the
    // shop, so a round trip per row is the wrong shape from the start.
    const lastMessages = await this.latestMessagePerChat(
      chats.map((chat) => chat.id),
    );

    return chats.map((chat) =>
      this.toChatSummary(chat, lastMessages.get(chat.id) ?? null),
    );
  }

  // The newest message of each of the given chats, in one pass. Ordered
  // oldest-first and written into the map as it goes, so the last write for
  // any chat is that chat's newest message.
  private async latestMessagePerChat(
    chatIds: number[],
  ): Promise<Map<number, SupportMessage>> {
    if (chatIds.length === 0) return new Map();

    const messages = await this.messagesRepository.find({
      where: { chatId: In(chatIds) },
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    const latest = new Map<number, SupportMessage>();

    for (const message of messages) {
      latest.set(message.chatId, message);
    }

    return latest;
  }

  toChatSummary(chat: SupportChat, lastMessage: SupportMessage | null) {
    return {
      id: chat.id,
      user: chat.user
        ? {
            id: chat.user.id,
            firstName: chat.user.firstName,
            lastName: chat.user.lastName,
            email: chat.user.email,
          }
        : null,
      // A guest has no name to show, so the admin list falls back to the chat
      // number — stable, and enough to tell two guests apart.
      isGuest: !chat.userId,
      lastMessage: lastMessage
        ? { content: lastMessage.content, senderRole: lastMessage.senderRole }
        : null,
      lastMessageAt: chat.lastMessageAt,
      unreadByAdmin: chat.unreadByAdmin,
      isOnline: this.presence.isOnline(chat.id),
    };
  }

  async addMessage(
    chatId: number,
    senderId: number | null,
    senderRole: UserRole,
    content: string,
  ) {
    const chat = await this.getChatById(chatId);

    const message = await this.messagesRepository.save(
      this.messagesRepository.create({ chatId, senderId, senderRole, content }),
    );

    chat.lastMessageAt = message.createdAt;
    if (senderRole === UserRole.ADMIN) {
      chat.unreadByUser += 1;
    } else {
      chat.unreadByAdmin += 1;
    }
    await this.chatsRepository.save(chat);

    const fullMessage = await this.messagesRepository.findOne({
      where: { id: message.id },
    });

    return { message: fullMessage!, chat };
  }

  async markReadByAdmin(chatId: number) {
    await this.chatsRepository.update({ id: chatId }, { unreadByAdmin: 0 });
  }

  async markReadByUser(chatId: number) {
    await this.chatsRepository.update({ id: chatId }, { unreadByUser: 0 });
  }
}
