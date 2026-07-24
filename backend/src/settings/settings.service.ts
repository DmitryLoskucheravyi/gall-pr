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
      this.settingsRepository.create({ authorName: '' }),
    );
  }

  async update(dto: UpdateSettingsDto): Promise<AppSettings> {
    const settings = await this.get();

    settings.authorName = dto.authorName;

    return this.settingsRepository.save(settings);
  }
}
