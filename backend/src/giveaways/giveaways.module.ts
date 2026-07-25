import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Giveaway } from './entities/giveaway.entity';
import { GiveawayParticipant } from './entities/giveaway-participant.entity';
import { GiveawaysService } from './giveaways.service';
import { GiveawaysController } from './giveaways.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Giveaway, GiveawayParticipant])],
  providers: [GiveawaysService],
  controllers: [GiveawaysController],
})
export class GiveawaysModule {}
