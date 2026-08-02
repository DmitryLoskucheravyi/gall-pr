import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Giveaway } from './entities/giveaway.entity';
import { GiveawayParticipant } from './entities/giveaway-participant.entity';
import { GiveawaysService } from './giveaways.service';
import { GiveawaysController } from './giveaways.controller';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Giveaway, GiveawayParticipant]),
    TelegramModule,
  ],
  providers: [GiveawaysService],
  controllers: [GiveawaysController],
})
export class GiveawaysModule {}
