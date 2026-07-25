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

import { GiveawaysService } from './giveaways.service';
import { CreateGiveawayDto } from './dto/create-giveaway.dto';
import { UpdateGiveawayDto } from './dto/update-giveaway.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';

@Controller('giveaways')
export class GiveawaysController {
  constructor(private readonly giveawaysService: GiveawaysService) {}

  @Get()
  findAll() {
    return this.giveawaysService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.giveawaysService.findOne(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/my-status')
  hasJoined(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.giveawaysService.hasJoined(Number(id), req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  join(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.giveawaysService.join(Number(id), req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateGiveawayDto) {
    return this.giveawaysService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGiveawayDto) {
    return this.giveawaysService.update(Number(id), dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.giveawaysService.remove(Number(id));
  }
}
