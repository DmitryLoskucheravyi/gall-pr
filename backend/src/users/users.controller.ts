import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
