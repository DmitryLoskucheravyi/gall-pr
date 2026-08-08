import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
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

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Request() req: OptionalAuthenticatedRequest) {
    return this.ordersService.findAllForIdentity(resolveIdentity(req));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('all')
  findAllAdmin() {
    return this.ordersService.findAllAdmin();
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Request() req: OptionalAuthenticatedRequest, @Param('id') id: string) {
    return this.ordersService.findOne(resolveIdentity(req), Number(id));
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Patch(':id/cancel')
  cancel(@Request() req: OptionalAuthenticatedRequest, @Param('id') id: string) {
    return this.ordersService.cancel(resolveIdentity(req), Number(id));
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post(':id/payment-proof')
  @UseInterceptors(
    FileInterceptor('image', { storage: diskStorage({ destination: './temp' }) }),
  )
  uploadPaymentProof(
    @Request() req: OptionalAuthenticatedRequest,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.ordersService.uploadPaymentProof(
      resolveIdentity(req),
      Number(id),
      file,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatusAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatusAdmin(
      Number(id),
      dto.status,
      dto.trackingNumber,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/payment-status')
  updatePaymentStatusAdmin(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatusAdmin(
      Number(id),
      dto.paymentStatus,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/status-mail')
  sendStatusMailAdmin(@Param('id') id: string) {
    return this.ordersService.sendStatusMailAdmin(Number(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/apology-mail')
  sendApologyMailAdmin(@Param('id') id: string) {
    return this.ordersService.sendApologyMailAdmin(Number(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  removeAdmin(@Param('id') id: string) {
    return this.ordersService.removeAdmin(Number(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/archive')
  archiveAdmin(@Param('id') id: string) {
    return this.ordersService.archiveAdmin(Number(id));
  }
}
