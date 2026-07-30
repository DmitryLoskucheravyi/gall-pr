import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppSettings } from './entities/app-settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

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
}
