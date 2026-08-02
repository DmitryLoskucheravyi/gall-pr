import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { RedeemTelegramCodeDto } from './dto/redeem-telegram-code.dto';
import { User } from './entities/user.entity';
import { TelegramService } from '../telegram/telegram.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly telegramService: TelegramService,
  ) {}

  @Get()
  findAll() {
    return this.usersService.findAllAdmin();
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.usersService.remove(Number(id), req.user.id);
  }

  // Any authenticated user (not just admins) may link their own Telegram —
  // overrides the class-level admin-only role restriction.
  @Roles('USER', 'ADMIN')
  @Post('me/telegram-link-code')
  generateTelegramLinkCode(@Request() req: AuthenticatedRequest) {
    return this.usersService.generateTelegramLinkCode(req.user.id);
  }

  // Bot -> site direction: the user typed in a code the bot gave them
  // (opened via the plain bot link rather than the personalized deep link).
  // Returns the updated user in the same shape as /auth/me so the frontend
  // can drop it straight into Redux.
  @Roles('USER', 'ADMIN')
  @Post('me/telegram-link-code/redeem')
  async redeemTelegramLinkCode(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RedeemTelegramCodeDto,
  ) {
    await this.usersService.redeemTelegramPendingCode(req.user.id, dto.code);
    const user = await this.usersService.findById(req.user.id);

    this.telegramService
      .notifyUser(
        user!.id,
        '✅ Верифікацію пройдено успішно! Тепер сюди надходитимуть сповіщення про ваші замовлення.',
      )
      .catch(() => {});

    return this.toAuthUserShape(user!);
  }

  // Clears a stale/dead chat link (e.g. the user deleted or blocked the bot)
  // so they can go through the linking flow again from a clean state.
  @Roles('USER', 'ADMIN')
  @Delete('me/telegram-link')
  async resetTelegramLink(@Request() req: AuthenticatedRequest) {
    await this.usersService.resetTelegramLink(req.user.id);
    const user = await this.usersService.findById(req.user.id);

    return this.toAuthUserShape(user!);
  }

  // Matches AuthService.buildUserResponse's shape so the frontend can drop
  // the result straight into Redux via setUser.
  private toAuthUserShape(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      telegramLinked: !!user.telegramChatId,
    };
  }
}
