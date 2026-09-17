import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Series } from './entities/series.entity';
import { Painting } from '../paintings/entities/painting.entity';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';

@Module({
  // Painting is here because a series is counted and filled by writing to
  // paintings.series_id — the relation's foreign key lives on that side.
  imports: [TypeOrmModule.forFeature([Series, Painting])],
  providers: [SeriesService],
  controllers: [SeriesController],
  exports: [SeriesService],
})
export class SeriesModule {}
