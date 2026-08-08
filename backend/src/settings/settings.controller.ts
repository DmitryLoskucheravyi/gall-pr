import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import {
  CreateFaqItemDto,
  ReorderFaqDto,
  UpdateFaqItemDto,
} from './dto/faq-item.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Public, and therefore a projection rather than the row. The storefront
  // needs the author's name, the support contacts and the hero picks; it has
  // never needed the admin's Telegram chat id or the live code that binds it.
  @Get()
  get() {
    return this.settingsService.getPublic();
  }

  // The full row, for the settings screen. Declared before any parameterised
  // GET would be, so 'admin' can't be swallowed as a path parameter later.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin')
  getForAdmin() {
    return this.settingsService.get();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('telegram-link-code')
  generateAdminTelegramLinkCode() {
    return this.settingsService.generateAdminTelegramLinkCode();
  }

  // Clears adminTelegramChatId (e.g. the admin deleted/blocked the chat) so
  // "Прив'язати бота" reappears — the only way back in, since the id itself
  // is never editable by hand.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('telegram-link')
  resetAdminTelegramLink() {
    return this.settingsService.resetAdminTelegramLink();
  }

  @Get('faq')
  getFaq() {
    return this.settingsService.getFaq();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('faq')
  createFaqItem(@Body() dto: CreateFaqItemDto) {
    return this.settingsService.createFaqItem(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('faq/reorder')
  reorderFaq(@Body() dto: ReorderFaqDto) {
    return this.settingsService.reorderFaq(dto.order);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('faq/:id')
  updateFaqItem(@Param('id') id: string, @Body() dto: UpdateFaqItemDto) {
    return this.settingsService.updateFaqItem(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('faq/:id')
  deleteFaqItem(@Param('id') id: string) {
    return this.settingsService.deleteFaqItem(id);
  }
}
