import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { MailService } from './mail.service';
import { MailStatus } from './entities/mail-outbox.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// The delivery log, admin-only: every letter the shop tried to send, why it
// failed, and a way to push it out again once the cause is fixed.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('outbox')
  list(@Query('status') status?: MailStatus) {
    return this.mailService.listOutbox(status);
  }

  @Delete('outbox/settled')
  clearSettled() {
    return this.mailService.clearSettledLetters();
  }

  @Get('outbox/:id')
  findOne(@Param('id') id: string) {
    return this.mailService.findOutboxLetter(Number(id));
  }

  @Post('outbox/:id/retry')
  retry(@Param('id') id: string) {
    return this.mailService.retryOutboxLetter(Number(id));
  }
}
