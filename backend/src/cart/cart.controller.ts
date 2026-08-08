import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import type { OptionalAuthenticatedRequest } from '../auth/types/optional-authenticated-request.type';
import { resolveIdentity } from '../common/identity.util';

@Controller('cart')
@UseGuards(OptionalJwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Request() req: OptionalAuthenticatedRequest) {
    return this.cartService.getCart(resolveIdentity(req));
  }

  @Post()
  addItem(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(resolveIdentity(req), dto);
  }

  @Patch(':paintingId')
  updateItem(
    @Request() req: OptionalAuthenticatedRequest,
    @Param('paintingId') paintingId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(
      resolveIdentity(req),
      Number(paintingId),
      dto.quantity,
    );
  }

  @Delete(':paintingId')
  removeItem(
    @Request() req: OptionalAuthenticatedRequest,
    @Param('paintingId') paintingId: string,
  ) {
    return this.cartService.removeItem(resolveIdentity(req), Number(paintingId));
  }

  @Delete()
  clearCart(@Request() req: OptionalAuthenticatedRequest) {
    return this.cartService.clearCart(resolveIdentity(req));
  }

  // Takes a guest token from the body and moves that cart onto the caller's
  // account. The token is the only thing standing in for ownership, so this is
  // a route somebody could sweep for tokens — legitimately it fires once, right
  // after signing in.
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  @Post('merge')
  mergeGuestCart(
    @Request() req: AuthenticatedRequest,
    @Body() dto: MergeCartDto,
  ) {
    return this.cartService.mergeGuestCart(req.user.id, dto.guestToken);
  }
}
