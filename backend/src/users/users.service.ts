import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, Repository } from 'typeorm';
import { randomBytes } from 'crypto';

import { User } from './entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { PaintingLike } from '../likes/entities/painting-like.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { SupportChat } from '../support/entities/support-chat.entity';
import { SupportMessage } from '../support/entities/support-message.entity';
import { GiveawayParticipant } from '../giveaways/entities/giveaway-participant.entity';

const TELEGRAM_LINK_CODE_TTL_MS = 10 * 60 * 1000; // 10 min

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);

    return this.usersRepository.save(user);
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async updateRefreshToken(
    userId: number,
    refreshToken: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken });
  }

  async update(userId: number, data: Partial<User>): Promise<void> {
    await this.usersRepository.update(userId, data);
  }

  // Short-lived code behind the t.me deep link shown on the profile page —
  // the bot's /start handler resolves it back to this user and stores the
  // resulting chat id.
  async generateTelegramLinkCode(
    userId: number,
  ): Promise<{ code: string; expiresAt: Date }> {
    const code = randomBytes(6).toString('hex');
    const expiresAt = new Date(Date.now() + TELEGRAM_LINK_CODE_TTL_MS);

    await this.usersRepository.update(userId, {
      telegramLinkCode: code,
      telegramLinkCodeExpiresAt: expiresAt,
    });

    return { code, expiresAt };
  }

  async findByTelegramLinkCode(code: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { telegramLinkCode: code, telegramLinkCodeExpiresAt: MoreThan(new Date()) },
    });
  }

  // Admin listing — never exposes password/refresh/verification secrets.
  async findAllAdmin() {
    return this.usersRepository.find({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  // Deletes a user and their owned data in one transaction. Orders are kept
  // (business records) but anonymised — their user_id is nulled so history and
  // stock stay intact.
  async remove(id: number, requesterId: number): Promise<void> {
    if (id === requesterId) {
      throw new BadRequestException('Не можна видалити власний акаунт');
    }

    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Користувача не знайдено');

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Order, { userId: id }, { userId: null });
      await manager.delete(PaintingLike, { userId: id });
      await manager.delete(CartItem, { userId: id });
      await manager.delete(GiveawayParticipant, { userId: id });

      const chats = await manager.find(SupportChat, { where: { userId: id } });
      const chatIds = chats.map((c) => c.id);
      if (chatIds.length) {
        await manager.delete(SupportMessage, { chatId: In(chatIds) });
      }
      await manager.delete(SupportMessage, { senderId: id });
      await manager.delete(SupportChat, { userId: id });

      await manager.delete(User, id);
    });
  }
}
