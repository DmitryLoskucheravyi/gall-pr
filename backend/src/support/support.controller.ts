import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';

import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('my-chat')
  async getMyChat(@Request() req: AuthenticatedRequest) {
    const chat = await this.supportService.getOrCreateChatForUser(req.user.id);
    const messages = await this.supportService.getMessages(chat.id);
    await this.supportService.markReadByUser(chat.id);

    return { chat, messages };
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('chats')
  getChats() {
    return this.supportService.getAdminChatList();
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('chats/:id/messages')
  async getChatMessages(@Param('id') id: string) {
    const chatId = Number(id);
    const messages = await this.supportService.getMessages(chatId);
    await this.supportService.markReadByAdmin(chatId);

    return messages;
  }
}
