import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { SupportChat } from './entities/support-chat.entity';
import { SupportMessage } from './entities/support-message.entity';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { SupportGateway } from './support.gateway';
import { SupportPresenceService } from './support-presence.service';
import { TelegramModule } from '../telegram/telegram.module';
import { jwtAccessSecret } from '../config/secrets';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportChat, SupportMessage]),
    // The gateway only ever verifies access tokens off the socket handshake.
    JwtModule.registerAsync({
      useFactory: () => ({ secret: jwtAccessSecret() }),
    }),
    TelegramModule,
  ],
  providers: [SupportService, SupportGateway, SupportPresenceService],
  controllers: [SupportController],
})
export class SupportModule {}
