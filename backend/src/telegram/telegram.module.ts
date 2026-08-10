import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SettingsModule } from '../settings/settings.module';
import { UsersModule } from '../users/users.module';
import { TelegramPendingLink } from './entities/telegram-pending-link.entity';
import { Painting } from '../paintings/entities/painting.entity';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    // The bot names the work someone is asking to have repeated, so it needs
    // to look the painting up from the id in the deep link.
    TypeOrmModule.forFeature([TelegramPendingLink, Painting]),
    SettingsModule,
    forwardRef(() => UsersModule),
  ],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
