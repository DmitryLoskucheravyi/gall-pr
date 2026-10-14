import { Module } from '@nestjs/common';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

// The admin dashboard's numbers. Read-only aggregates over the shop's own
// tables — no entities of its own, so it takes the DataSource rather than
// registering repositories.
@Module({ controllers: [AnalyticsController], providers: [AnalyticsService] })
export class AnalyticsModule {}
