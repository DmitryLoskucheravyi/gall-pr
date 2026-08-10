import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot, InputFile } from 'grammy';
import { randomInt } from 'crypto';

import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import { TelegramPendingLink } from './entities/telegram-pending-link.entity';
import { Painting } from '../paintings/entities/painting.entity';

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
    @InjectRepository(Painting)
    private readonly paintingsRepository: Repository<Painting>,
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

      // Someone who followed "write in Telegram" from the repeat dialog. The
      // painting travels in the deep link, so neither of them has to type out
      // which one it was — the visitor presses Start and the artist gets a
      // message naming the work and whom to answer.
      const repeat = /^repeat_(\d+)$/.exec(payload ?? '');
      if (repeat) {
        await this.handleRepeatEnquiry(ctx, Number(repeat[1]));
        return;
      }

      if (!payload) {
        // No linking code in the /start payload — the user opened the bot
        // directly (e.g. via the support link) rather than a personalized
        // deep link. This is always a regular visitor: the admin's own
        // linking always goes through the payload branch below via its own
        // dedicated deep link, so there is nothing admin-related to mention
        // here — a chat id means nothing to anyone but the admin.
        //
        // randomInt, not Math.random: this code is the sole credential for
        // binding a site account to this chat, and Math.random's state is
        // recoverable from a handful of outputs.
        const code = String(randomInt(100000, 1000000));

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

  // The repeat enquiry, arriving through the deep link in the commission
  // dialog rather than through the form.
  //
  // The whole point is that neither side has to explain anything: the visitor
  // presses one button, and the artist gets a message saying which work and
  // whom to answer. Whether that's possible turns on the @username — an admin
  // can open a chat from one, and can't from a numeric id — so when it's
  // missing the message says so plainly instead of leaving her to discover it.
  private async handleRepeatEnquiry(
    ctx: { chat: { id: number }; from?: { first_name: string; last_name?: string; username?: string }; reply: (text: string) => Promise<unknown> },
    paintingId: number,
  ) {
    const painting = await this.paintingsRepository.findOne({
      where: { id: paintingId },
    });

    const title = painting?.title ?? `#${paintingId}`;
    const from = ctx.from;
    const name = `${from?.first_name ?? ''} ${from?.last_name ?? ''}`.trim() || 'Без імені';

    // Anything this chat writes from here reaches the artist, so the promise
    // above survives the customer answering it. Without this the bot would
    // meet their next message with "type /support first" — an odd thing to
    // say to someone it has just told it would be in touch.
    this.supportModeChats.add(String(ctx.chat.id));

    await ctx.reply(
      painting
        ? `Ви цікавитесь повтором роботи «${title}».\n\nМи вже передали це автору — вона невдовзі з вами звʼяжеться.`
        : 'Ви цікавитесь повтором роботи.\n\nМи вже передали це автору — вона невдовзі з вами звʼяжеться.',
    );

    await this.notifyAdminWithImage(
      [
        '🎨 Запит на повтор через Telegram',
        '',
        `Робота: «${title}»`,
        `Від: ${name}`,
        from?.username
          ? `Написати: @${from.username}`
          : `⚠️ Без @username — відповісти можна лише через цей бот (chat id ${ctx.chat.id})`,
      ].join('\n'),
      painting?.cardImage,
    );
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

  // Same as notifyAdmin, but takes the image as a URL and fetches it here.
  //
  // A repeat enquiry is about one specific painting, and the artist shouldn't
  // have to recognise it from a title alone. The bytes are pushed rather than
  // the URL handed over for the reason noted on send(): Telegram fetching a
  // Cloudinary URL itself is unreliable.
  //
  // A picture that won't load must never cost the message — the whole point of
  // the notification is the enquiry, not the photograph.
  async notifyAdminWithImage(text: string, imageUrl?: string | null) {
    await this.notifyAdmin(text, await this.fetchImage(imageUrl));
  }

  private async fetchImage(imageUrl?: string | null): Promise<Buffer | undefined> {
    if (!imageUrl) return undefined;

    try {
      // A downsized JPEG, not the original: catalogue images are several
      // megabytes, Telegram caps sendPhoto at ten, and f_jpg avoids handing it
      // an AVIF or WebP it may refuse.
      const marker = '/image/upload/';
      const at = imageUrl.indexOf(marker);
      const url =
        at === -1
          ? imageUrl
          : `${imageUrl.slice(0, at + marker.length)}f_jpg,q_auto,w_1280/${imageUrl.slice(at + marker.length)}`;

      const response = await fetch(url);
      if (!response.ok) return undefined;

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      this.logger.warn(`Could not fetch image for a Telegram notification`, error);
      return undefined;
    }
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
