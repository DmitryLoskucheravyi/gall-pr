import { Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';

import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';

@Controller('likes')
@UseGuards(JwtAuthGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':paintingId')
  toggle(
    @Request() req: AuthenticatedRequest,
    @Param('paintingId') paintingId: string,
  ) {
    return this.likesService.toggleLike(req.user.id, Number(paintingId));
  }

  @Get('mine')
  getMyLikedIds(@Request() req: AuthenticatedRequest) {
    return this.likesService.getMyLikedIds(req.user.id);
  }

  @Get('paintings')
  getMyLikedPaintings(@Request() req: AuthenticatedRequest) {
    return this.likesService.getMyLikedPaintings(req.user.id);
  }
}
