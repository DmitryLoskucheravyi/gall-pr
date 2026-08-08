import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID, randomBytes, timingSafeEqual } from 'crypto';

import { AppSettings, FaqMap } from './entities/app-settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateFaqItemDto, UpdateFaqItemDto } from './dto/faq-item.dto';

const ADMIN_LINK_CODE_TTL_MS = 10 * 60 * 1000; // 10 min

function secretsMatch(expected: string, received: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);

  return left.length === right.length && timingSafeEqual(left, right);
}

// What an anonymous visitor is allowed to see. Everything the storefront
// actually renders — the author's name, the support contacts, the hero picks,
// and the IBAN a card-transfer customer has to pay against.
//
// Deliberately absent: adminTelegramLinkCode, which is a live one-time code
// that binds the bot's admin notifications to whoever redeems it, and
// adminTelegramChatId. Those were being handed to anybody who asked for
// GET /settings, so polling that route until the admin pressed "link the bot"
// was enough to take over every order, payment-proof and support notification
// the shop sends. Also absent: the Nova Poshta sender city, which is internal
// and nothing on the storefront reads.
export type PublicSettings = {
  authorName: string;
  cardTransferIban: string;
  supportEmail: string;
  supportPhone: string;
  supportTelegramUrl: string;
  heroPaintingId1: number | null;
  heroPaintingId2: number | null;
  heroPaintingId3: number | null;
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AppSettings)
    private readonly settingsRepository: Repository<AppSettings>,
  ) {}

  // Lazily creates the single settings row on first use. Two things matter
  // here that didn't used to:
  //
  //  - the read is ordered by id, so once a row exists every caller agrees on
  //    which one it is. find({ take: 1 }) with no order returns whatever the
  //    engine feels like, which on a table with two rows means settings that
  //    change depending on the query plan;
  //  - two concurrent first-ever requests both saw an empty table and both
  //    inserted. The insert is now retried through a re-read, so the loser of
  //    that race returns the winner's row instead of creating a second one.
  async get(): Promise<AppSettings> {
    const existing = await this.findRow();

    if (existing) {
      return existing;
    }

    try {
      return await this.createDefaultRow();
    } catch {
      // Almost certainly the other half of the race having inserted first.
      const raced = await this.findRow();

      if (raced) return raced;

      throw new Error('Failed to create the application settings row');
    }
  }

  private async findRow(): Promise<AppSettings | null> {
    const [settings] = await this.settingsRepository.find({
      order: { id: 'ASC' },
      take: 1,
    });

    return settings ?? null;
  }

  // id is pinned to 1 on purpose. app_settings has no natural unique key, so
  // without it two concurrent inserts both succeed and the table quietly ends
  // up with two rows — the retry above would never fire, because nothing
  // failed. Writing the primary key explicitly makes the second insert a
  // duplicate-key error, which is exactly the signal the caller needs.
  private createDefaultRow(): Promise<AppSettings> {
    return this.settingsRepository.save(
      this.settingsRepository.create({
        id: 1,
        authorName: '',
        cardTransferIban: '',
        novaPoshtaSenderCityRef: '',
        novaPoshtaSenderCityName: '',
        supportEmail: '',
        supportPhone: '',
        supportTelegramUrl: '',
        adminTelegramChatId: '',
        adminTelegramLinkCode: null,
        adminTelegramLinkCodeExpiresAt: null,
        heroPaintingId1: null,
        heroPaintingId2: null,
        heroPaintingId3: null,
        faq: {},
      }),
    );
  }

  // The storefront's view of the settings. get() stays as it was and keeps
  // returning the whole row: the order, mail and Telegram services all read
  // fields from it that no HTTP response should ever carry.
  async getPublic(): Promise<PublicSettings> {
    const settings = await this.get();

    return {
      authorName: settings.authorName,
      cardTransferIban: settings.cardTransferIban,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      supportTelegramUrl: settings.supportTelegramUrl,
      heroPaintingId1: settings.heroPaintingId1,
      heroPaintingId2: settings.heroPaintingId2,
      heroPaintingId3: settings.heroPaintingId3,
    };
  }

  // Object.assign only touches keys actually present on dto — fields the
  // caller omits are left as-is, so a partial PATCH can't blank out the
  // rest of the settings (this bit us once during manual API testing).
  async update(dto: UpdateSettingsDto): Promise<AppSettings> {
    const settings = await this.get();

    Object.assign(settings, dto);

    return this.settingsRepository.save(settings);
  }

  // Site -> bot direction, admin-only mirror of the profile page's Telegram
  // linking: generates a one-time code embedded in a t.me deep link. The
  // bot's /start handler resolves it straight to adminTelegramChatId — the
  // admin never needs to see or paste a raw chat id.
  async generateAdminTelegramLinkCode(): Promise<{ code: string; expiresAt: Date }> {
    const settings = await this.get();
    const code = randomBytes(6).toString('hex');
    const expiresAt = new Date(Date.now() + ADMIN_LINK_CODE_TTL_MS);

    settings.adminTelegramLinkCode = code;
    settings.adminTelegramLinkCodeExpiresAt = expiresAt;
    await this.settingsRepository.save(settings);

    return { code, expiresAt };
  }

  async resetAdminTelegramLink(): Promise<AppSettings> {
    const settings = await this.get();

    settings.adminTelegramChatId = '';
    settings.adminTelegramLinkCode = null;
    settings.adminTelegramLinkCodeExpiresAt = null;

    return this.settingsRepository.save(settings);
  }

  async redeemAdminTelegramLinkCode(code: string, chatId: string): Promise<boolean> {
    const settings = await this.get();

    // Constant-time, like every other secret comparison in the codebase. The
    // channel here is Telegram rather than HTTP, so timing is barely a
    // practical attack — but a one-time code that grants the admin
    // notification stream shouldn't be the one place compared with ===.
    const valid =
      !!settings.adminTelegramLinkCode &&
      secretsMatch(settings.adminTelegramLinkCode, code) &&
      !!settings.adminTelegramLinkCodeExpiresAt &&
      settings.adminTelegramLinkCodeExpiresAt.getTime() > Date.now();

    if (!valid) return false;

    settings.adminTelegramChatId = chatId;
    settings.adminTelegramLinkCode = null;
    settings.adminTelegramLinkCodeExpiresAt = null;
    await this.settingsRepository.save(settings);

    return true;
  }

  async getFaq(): Promise<FaqMap> {
    const settings = await this.get();
    return settings.faq ?? {};
  }

  async createFaqItem(dto: CreateFaqItemDto): Promise<FaqMap> {
    const settings = await this.get();
    const faq = settings.faq ?? {};

    const maxOrder = Object.values(faq).reduce(
      (max, item) => Math.max(max, item.order),
      -1,
    );

    faq[randomUUID()] = { title: dto.title, text: dto.text, order: maxOrder + 1 };

    settings.faq = faq;
    await this.settingsRepository.save(settings);

    return faq;
  }

  async updateFaqItem(id: string, dto: UpdateFaqItemDto): Promise<FaqMap> {
    const settings = await this.get();
    const faq = settings.faq ?? {};

    if (!faq[id]) {
      throw new NotFoundException('FAQ item not found');
    }

    faq[id] = { ...faq[id], ...dto };
    settings.faq = faq;
    await this.settingsRepository.save(settings);

    return faq;
  }

  async deleteFaqItem(id: string): Promise<FaqMap> {
    const settings = await this.get();
    const faq = settings.faq ?? {};

    if (!faq[id]) {
      throw new NotFoundException('FAQ item not found');
    }

    delete faq[id];
    settings.faq = faq;
    await this.settingsRepository.save(settings);

    return faq;
  }

  async reorderFaq(order: Record<string, number>): Promise<FaqMap> {
    const settings = await this.get();
    const faq = settings.faq ?? {};

    for (const [id, newOrder] of Object.entries(order)) {
      if (faq[id]) {
        faq[id] = { ...faq[id], order: newOrder };
      }
    }

    settings.faq = faq;
    await this.settingsRepository.save(settings);

    return faq;
  }
}
