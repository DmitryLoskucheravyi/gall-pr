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

  // Read-only counterpart to my-chat, for the floating widget's badge.
  // Fetching the chat itself marks it read, so asking that route for a count
  // would clear the very thing it just reported — the badge showed up once
  // and was gone on the next page load.
  @Get('my-chat/unread')
  async getMyUnreadCount(@Request() req: AuthenticatedRequest) {
    const chat = await this.supportService.getOrCreateChatForUser(req.user.id);

    return { unread: chat.unreadByUser };
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
