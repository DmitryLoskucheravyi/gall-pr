import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Technique } from './entities/technique.entity';
import { TechniquesController } from './techniques.controller';
import { TechniquesService } from './techniques.service';

@Module({
  imports: [TypeOrmModule.forFeature([Technique])],
  providers: [TechniquesService],
  controllers: [TechniquesController],
  exports: [TechniquesService],
})
export class TechniquesModule {}
