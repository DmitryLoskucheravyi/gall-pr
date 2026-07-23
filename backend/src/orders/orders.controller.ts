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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  checkout(@Request() req: AuthenticatedRequest) {
    return this.ordersService.checkout(req.user.id);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.ordersService.findAllForUser(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('all')
  findAllAdmin() {
    return this.ordersService.findAllAdmin();
  }

  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.ordersService.findOne(req.user.id, Number(id));
  }

  @Patch(':id/cancel')
  cancel(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.ordersService.cancel(req.user.id, Number(id));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatusAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatusAdmin(Number(id), dto.status);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  removeAdmin(@Param('id') id: string) {
    return this.ordersService.removeAdmin(Number(id));
  }
}
