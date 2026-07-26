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

import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import type { OptionalAuthenticatedRequest } from '../auth/types/optional-authenticated-request.type';
import { resolveIdentity } from '../common/identity.util';

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

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.ordersService.findAllForUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('all')
  findAllAdmin() {
    return this.ordersService.findAllAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.ordersService.findOne(req.user.id, Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancel(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.ordersService.cancel(req.user.id, Number(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatusAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatusAdmin(Number(id), dto.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  removeAdmin(@Param('id') id: string) {
    return this.ordersService.removeAdmin(Number(id));
  }
}
