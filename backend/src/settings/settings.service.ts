import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { AppSettings, FaqMap } from './entities/app-settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateFaqItemDto, UpdateFaqItemDto } from './dto/faq-item.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AppSettings)
    private readonly settingsRepository: Repository<AppSettings>,
  ) {}

  async get(): Promise<AppSettings> {
    const settings = await this.settingsRepository.find({ take: 1 });

    if (settings.length > 0) {
      return settings[0];
    }

    return this.settingsRepository.save(
      this.settingsRepository.create({
        authorName: '',
        cardTransferIban: '',
        novaPoshtaSenderCityRef: '',
        novaPoshtaSenderCityName: '',
        faq: {},
      }),
    );
  }

  // Object.assign only touches keys actually present on dto — fields the
  // caller omits are left as-is, so a partial PATCH can't blank out the
  // rest of the settings (this bit us once during manual API testing).
  async update(dto: UpdateSettingsDto): Promise<AppSettings> {
    const settings = await this.get();

    Object.assign(settings, dto);

    return this.settingsRepository.save(settings);
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
