import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AnalyticsService } from './analytics.service';
import { OverviewQueryDto } from './dto/overview-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Everything the admin dashboard draws, for one period, in one response.
  @Get('overview')
  overview(@Query() query: OverviewQueryDto) {
    return this.analyticsService.overview(query.days ?? 30);
  }
}
