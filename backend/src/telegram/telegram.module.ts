import { Module } from '@nestjs/common';

import { SettingsModule } from '../settings/settings.module';
import { UsersModule } from '../users/users.module';
import { TelegramService } from './telegram.service';

@Module({
  imports: [SettingsModule, UsersModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
