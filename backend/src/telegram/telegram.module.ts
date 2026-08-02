import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SettingsModule } from '../settings/settings.module';
import { UsersModule } from '../users/users.module';
import { TelegramPendingLink } from './entities/telegram-pending-link.entity';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramPendingLink]),
    SettingsModule,
    forwardRef(() => UsersModule),
  ],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
