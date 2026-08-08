import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';

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
  async getOrCreateChat(identity: Identity): Promise<SupportChat> {
    const existing = await this.findChat(identity);
    if (existing) return existing;

    return this.chatsRepository.save(
      this.chatsRepository.create(this.identityWhere(identity)),
    );
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
    if (!guestChat) return { message: 'Nothing to claim' };

    const ownChat = await this.chatsRepository.findOne({ where: { userId } });
    if (ownChat) return { message: 'Chat already exists' };

    guestChat.userId = userId;
    guestChat.guestToken = null;
    await this.chatsRepository.save(guestChat);

    return { message: 'Chat claimed' };
  }

  async getChatById(chatId: number): Promise<SupportChat> {
    const chat = await this.chatsRepository.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
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

    const lastMessages = await Promise.all(
      chats.map((chat) =>
        this.messagesRepository.findOne({
          where: { chatId: chat.id },
          order: { createdAt: 'DESC' },
        }),
      ),
    );

    return chats.map((chat, index) =>
      this.toChatSummary(chat, lastMessages[index] ?? null),
    );
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
