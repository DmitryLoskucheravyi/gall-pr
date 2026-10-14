import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { resolveIdentity } from '../common/identity.util';
import type { OptionalAuthenticatedRequest } from '../auth/types/optional-authenticated-request.type';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // The homepage's section. Public.
  @Get()
  findPublished() {
    return this.reviewsService.findPublished();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin')
  findAllAdmin() {
    return this.reviewsService.findAllAdmin();
  }

  // A customer — signed in, or a guest with the token they ordered under —
  // reviewing an order of theirs that has been delivered. One per order.
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  create(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(resolveIdentity(req), dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReviewDto) {
    return this.reviewsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.remove(id);
  }
}
