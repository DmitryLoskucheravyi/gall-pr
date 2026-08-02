import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Bot, InputFile } from 'grammy';

import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';

// Thin wrapper around the Telegram Bot API (via grammy), long-polling so it
// needs no public URL/webhook — works the same in dev and prod. Every method
// is a no-op (logged, never thrown) when TELEGRAM_BOT_TOKEN is unset, mirroring
// MailService/PaymentsService: the feature builds against the real, documented
// API and just lights up once a token is dropped into .env.
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot | null = null;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly usersService: UsersService,
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
        await ctx.reply(
          `Це ваш Telegram Chat ID: ${chatId}\n\nВставте його в адмінці → Налаштування → "Telegram чат адміна", щоб отримувати сповіщення про нові замовлення та повідомлення підтримки.`,
        );
        return;
      }

      const user = await this.usersService.findByTelegramLinkCode(payload);
      if (!user) {
        await ctx.reply(
          'Код недійсний або застарів. Згенеруйте нове посилання в профілі на сайті.',
        );
        return;
      }

      await this.usersService.update(user.id, {
        telegramChatId: chatId,
        telegramLinkCode: null,
        telegramLinkCodeExpiresAt: null,
      });

      await ctx.reply(
        `Готово, ${user.firstName || 'вітаємо'}! Акаунт звʼязано з Telegram — тепер надсилатимемо сюди статуси ваших замовлень.`,
      );
    });
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
