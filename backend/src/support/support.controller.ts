import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';

import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ClaimGuestChatDto } from './dto/claim-guest-chat.dto';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import type { OptionalAuthenticatedRequest } from '../auth/types/optional-authenticated-request.type';
import { resolveIdentity } from '../common/identity.util';

// Support is open to everyone: a customer with a question rarely has an
// account yet, and asking them to register first is asking them to leave.
// Guests are identified by the same X-Guest-Token their cart already uses.
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // Opening the chat doesn't start one: the thread is created by the first
  // message, so a visitor who looks and leaves stays out of the admin's inbox.
  @UseGuards(OptionalJwtAuthGuard)
  @Get('my-chat')
  async getMyChat(@Request() req: OptionalAuthenticatedRequest) {
    const chat = await this.supportService.findChat(resolveIdentity(req));
    if (!chat) return { chat: null, messages: [] };

    const messages = await this.supportService.getMessages(chat.id);
    await this.supportService.markReadByUser(chat.id);

    return { chat, messages };
  }

  // Read-only counterpart to my-chat, for the floating widget's badge.
  // Fetching the chat itself marks it read, so asking that route for a count
  // would clear the very thing it just reported — the badge showed up once
  // and was gone on the next page load.
  @UseGuards(OptionalJwtAuthGuard)
  @Get('my-chat/unread')
  async getMyUnreadCount(@Request() req: OptionalAuthenticatedRequest) {
    const chat = await this.supportService.findChat(resolveIdentity(req));

    return { unread: chat?.unreadByUser ?? 0 };
  }

  // Signing in hands the guest thread over to the account, the same way the
  // guest cart is merged at that moment.
  @UseGuards(JwtAuthGuard)
  @Post('claim-guest-chat')
  claimGuestChat(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ClaimGuestChatDto,
  ) {
    return this.supportService.claimGuestChat(req.user.id, dto.guestToken);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('chats')
  getChats() {
    return this.supportService.getAdminChatList();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('chats/:id/messages')
  async getChatMessages(@Param('id') id: string) {
    const chatId = Number(id);
    const messages = await this.supportService.getMessages(chatId);
    await this.supportService.markReadByAdmin(chatId);

    return messages;
  }
}
