import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SupportChat } from './entities/support-chat.entity';
import { SupportMessage } from './entities/support-message.entity';
import { UserRole } from '../users/entities/user.entity';
import { SupportPresenceService } from './support-presence.service';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportChat)
    private readonly chatsRepository: Repository<SupportChat>,

    @InjectRepository(SupportMessage)
    private readonly messagesRepository: Repository<SupportMessage>,

    private readonly presence: SupportPresenceService,
  ) {}

  async getOrCreateChatForUser(userId: number): Promise<SupportChat> {
    const existing = await this.chatsRepository.findOne({ where: { userId } });
    if (existing) return existing;

    const chat = this.chatsRepository.create({ userId });
    return this.chatsRepository.save(chat);
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

  async getAdminChatList() {
    const chats = await this.chatsRepository.find({
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
      user: {
        id: chat.user.id,
        firstName: chat.user.firstName,
        lastName: chat.user.lastName,
        email: chat.user.email,
      },
      lastMessage: lastMessage
        ? { content: lastMessage.content, senderRole: lastMessage.senderRole }
        : null,
      lastMessageAt: chat.lastMessageAt,
      unreadByAdmin: chat.unreadByAdmin,
      isOnline: this.presence.isOnline(chat.userId),
    };
  }

  async addMessage(
    chatId: number,
    senderId: number,
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
