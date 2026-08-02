import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot, InputFile } from 'grammy';

import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import { TelegramPendingLink } from './entities/telegram-pending-link.entity';

const PENDING_CODE_TTL_MS = 10 * 60 * 1000; // 10 min

// Thin wrapper around the Telegram Bot API (via grammy), long-polling so it
// needs no public URL/webhook — works the same in dev and prod. Every method
// is a no-op (logged, never thrown) when TELEGRAM_BOT_TOKEN is unset, mirroring
// MailService/PaymentsService: the feature builds against the real, documented
// API and just lights up once a token is dropped into .env.
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot | null = null;

  // Chats currently in "talking to support" mode after /support. In-memory
  // and reset on restart — low stakes, worst case someone types /support
  // again, and persisting a live chat session to the DB buys nothing here.
  private readonly supportModeChats = new Set<string>();

  constructor(
    private readonly settingsService: SettingsService,
    private readonly usersService: UsersService,
    @InjectRepository(TelegramPendingLink)
    private readonly pendingLinkRepository: Repository<TelegramPendingLink>,
  ) {}

  async onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('[TELEGRAM NOT CONFIGURED] TELEGRAM_BOT_TOKEN is unset');
      return;
    }

    this.bot = new Bot(token);
    this.registerHandlers(this.bot);

    // Fire-and-forget: bot.start() resolves only when polling stops, so it must
    // not be awaited here or Nest's bootstrap would hang forever.
    this.bot.start().catch((error) => {
      this.logger.error('Telegram polling stopped unexpectedly', error);
    });

    this.logger.log('Telegram bot started (long polling)');
  }

  async onModuleDestroy() {
    await this.bot?.stop();
  }

  private registerHandlers(bot: Bot) {
    bot.command('start', async (ctx) => {
      const payload = ctx.match?.toString().trim();
      const chatId = String(ctx.chat.id);

      if (!payload) {
        // No linking code in the /start payload — the user opened the bot
        // directly (e.g. via the support link) rather than a personalized
        // deep link. This is always a regular visitor: the admin's own
        // linking always goes through the payload branch below via its own
        // dedicated deep link, so there is nothing admin-related to mention
        // here — a chat id means nothing to anyone but the admin.
        const code = String(Math.floor(100000 + Math.random() * 900000));

        await this.pendingLinkRepository.delete({ chatId });
        await this.pendingLinkRepository.save(
          this.pendingLinkRepository.create({
            code,
            chatId,
            expiresAt: new Date(Date.now() + PENDING_CODE_TTL_MS),
          }),
        );

        await ctx.reply(
          `Вітаємо в Viktorumm! 🎨\n\nВаш код підтвердження: ${code}\nВведіть його на сайті → Профіль → «Ввести код з Telegram» (діє 10 хв).`,
        );
        return;
      }

      // The payload can be either a regular user's linking code (from their
      // profile page) or the admin's own linking code (from Settings) —
      // try both, in that order, before giving up.
      const user = await this.usersService.findByTelegramLinkCode(payload);
      if (user) {
        await this.usersService.update(user.id, {
          telegramChatId: chatId,
          telegramLinkCode: null,
          telegramLinkCodeExpiresAt: null,
        });

        await ctx.reply(
          `Готово, ${user.firstName || 'вітаємо'}! Акаунт звʼязано з Telegram — тепер надсилатимемо сюди статуси ваших замовлень.`,
        );
        return;
      }

      const isAdminLink = await this.settingsService.redeemAdminTelegramLinkCode(
        payload,
        chatId,
      );
      if (isAdminLink) {
        await ctx.reply(
          'Готово! Тепер сюди надходитимуть сповіщення про нові замовлення, скріни оплати й повідомлення підтримки.',
        );
        return;
      }

      await ctx.reply(
        'Код недійсний або застарів. Згенеруйте нове посилання ще раз.',
      );
    });

    bot.command('support', async (ctx) => {
      this.supportModeChats.add(String(ctx.chat.id));
      await ctx.reply(
        'Слухаю вас! Напишіть повідомлення — і ми відповімо якнайшвидше.',
      );
    });

    // Any plain-text message that isn't a recognized command: nudge toward
    // /support if the chat hasn't opted in yet, otherwise relay it straight
    // to the admin with whatever contact info we have for this chat.
    bot.on('message:text', async (ctx) => {
      const chatId = String(ctx.chat.id);

      if (!this.supportModeChats.has(chatId)) {
        await ctx.reply(
          'Бажаєте звернутись в підтримку? Скористайтесь командою /support',
        );
        return;
      }

      const contact = await this.buildContactLine(chatId, ctx.from);
      await this.notifyAdmin(
        `💬 Повідомлення з бота\n${contact}\n\n${ctx.message.text}`,
      );
      await ctx.reply('Надіслано ✓');
    });
  }

  // Prefer the linked site account (real name/email/phone) when we have one;
  // otherwise fall back to whatever Telegram itself hands us for this chat.
  private async buildContactLine(
    chatId: string,
    from?: { first_name: string; last_name?: string; username?: string },
  ): Promise<string> {
    const linkedUser = await this.usersService.findByTelegramChatId(chatId);
    if (linkedUser) {
      return `${linkedUser.firstName} ${linkedUser.lastName} · ${linkedUser.email}${linkedUser.phone ? ` · ${linkedUser.phone}` : ''}`;
    }

    const name = `${from?.first_name ?? ''} ${from?.last_name ?? ''}`.trim() || 'Невідомий';
    const handle = from?.username ? `@${from.username}` : `Telegram id ${chatId} (без username)`;

    return `${name} · ${handle}`;
  }

  // Sends a plain-text message, or a photo with the text as caption when
  // photo is given (used for payment-proof screenshots). Photos go out as an
  // uploaded buffer rather than a remote URL — Telegram fetching a Cloudinary
  // URL itself is flaky ("failed to get HTTP URL content"), while pushing the
  // bytes directly always works.
  async notifyAdmin(text: string, photo?: Buffer) {
    if (!this.bot) return;

    const settings = await this.settingsService.get();
    const chatId = settings.adminTelegramChatId?.trim();
    if (!chatId) return;

    await this.send(chatId, text, photo);
  }

  async notifyUser(userId: number, text: string, photo?: Buffer) {
    if (!this.bot) return;

    const user = await this.usersService.findById(userId);
    const chatId = user?.telegramChatId;
    if (!chatId) return;

    await this.send(chatId, text, photo);
  }

  private async send(chatId: string, text: string, photo?: Buffer) {
    if (!this.bot) return;

    try {
      if (photo) {
        await this.bot.api.sendPhoto(chatId, new InputFile(photo), {
          caption: text,
        });
      } else {
        await this.bot.api.sendMessage(chatId, text);
      }
    } catch (error) {
      // A notification failure (bot blocked, chat id stale, network hiccup)
      // must never break the business flow that triggered it.
      this.logger.warn(`Failed to send Telegram message to ${chatId}`, error);
    }
  }
}
