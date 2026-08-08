import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailOutbox } from './entities/mail-outbox.entity';
import { MailController } from './mail.controller';
import { MailDispatcher } from './mail.dispatcher';
import { MailService } from './mail.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [TypeOrmModule.forFeature([MailOutbox]), TelegramModule],
  providers: [MailService, MailDispatcher],
  controllers: [MailController],
  exports: [MailService],
})
export class MailModule {}
