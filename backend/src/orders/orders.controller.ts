import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';

import { ADMIN_ORDERS_PAGE_SIZE, OrdersService } from './orders.service';
import type { AdminOrderTab } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { ClaimGuestOrdersDto } from './dto/claim-guest-orders.dto';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import type { OptionalAuthenticatedRequest } from '../auth/types/optional-authenticated-request.type';
import { resolveIdentity } from '../common/identity.util';
import { imageUploadOptions } from '../common/upload.options';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post('checkout')
  checkout(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() dto: CheckoutDto,
  ) {
    return this.ordersService.checkout(resolveIdentity(req), dto);
  }

  // A repeat of a sold-out work. Separate from checkout on purpose: it starts
  // from a painting rather than a cart, takes nothing out of stock, and owes
  // nothing yet. Open to guests, like checkout — someone commissioning a
  // painting shouldn't have to register first.
  //
  // Throttled harder than checkout: each one of these pings the artist's
  // Telegram and queues a letter, and nobody legitimately commissions five
  // paintings an hour.
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @UseGuards(OptionalJwtAuthGuard)
  @Post('commission')
  createCommission(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() dto: CreateCommissionDto,
  ) {
    return this.ordersService.createCommission(resolveIdentity(req), dto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Request() req: OptionalAuthenticatedRequest) {
    return this.ordersService.findAllForIdentity(resolveIdentity(req));
  }

  // Signing in brings the guest's orders across, alongside POST /cart/merge
  // and POST /support/claim-guest-chat. Same shape of risk as those two — the
  // token is the only claim of ownership — so the same ceiling.
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  @Post('claim-guest')
  claimGuestOrders(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ClaimGuestOrdersDto,
  ) {
    return this.ordersService.claimGuestOrders(req.user.id, dto.guestToken);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('all')
  findAllAdmin(
    @Query('tab') tab?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Clamped rather than rejected, for the same reason the catalogue clamps
    // its paging: a stale link in someone's bookmarks shouldn't be an error.
    const parsedPage = Math.max(1, Math.trunc(Number(page)) || 1);
    const parsedLimit = Math.min(
      100,
      Math.max(1, Math.trunc(Number(limit)) || ADMIN_ORDERS_PAGE_SIZE),
    );

    // Anything that isn't the completed tab is the active one — an unknown
    // value in a bookmarked URL falls back rather than erroring.
    const resolvedTab: AdminOrderTab =
      tab === 'completed' ? 'completed' : 'active';

    return this.ordersService.findAllAdmin(
      resolvedTab,
      parsedPage,
      parsedLimit,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(
    @Request() req: OptionalAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.findOne(resolveIdentity(req), id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Patch(':id/cancel')
  cancel(
    @Request() req: OptionalAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.cancel(resolveIdentity(req), id);
  }

  // Reachable without an account, and it writes to disk before the handler can
  // check who owns the order — so it gets a ceiling of its own on top of the
  // size/type limits in imageUploadOptions. Uploading a transfer screenshot is
  // something a customer does once.
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @UseGuards(OptionalJwtAuthGuard)
  @Post(':id/payment-proof')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  uploadPaymentProof(
    @Request() req: OptionalAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Додайте скріншот оплати');
    }

    return this.ordersService.uploadPaymentProof(
      resolveIdentity(req),
      id,
      file,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatusAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatusAdmin(
      id,
      dto.status,
      dto.trackingNumber,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/payment-status')
  updatePaymentStatusAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatusAdmin(id, dto.paymentStatus);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/status-mail')
  sendStatusMailAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.sendStatusMailAdmin(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/apology-mail')
  sendApologyMailAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.sendApologyMailAdmin(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  removeAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.removeAdmin(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/archive')
  archiveAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.archiveAdmin(id);
  }
}
