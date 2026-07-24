import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Delete,
} from '@nestjs/common';

import { PaintingsService } from './paintings.service';
import { CreatePaintingDto } from './dto/create-painting.dto';
import { GetPaintingsDto } from './dto/get-paintings.dto';
import { UpdatePaintingDto } from './dto/update-painting.dto';

import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';

@Controller('paintings')
export class PaintingsController {
  constructor(private readonly paintingsService: PaintingsService) {}
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(
    @Body()
    dto: CreatePaintingDto,
  ) {
    return this.paintingsService.create(dto);
  }

  @Get()
  findAll(
    @Query()
    query: GetPaintingsDto,
  ) {
    const page = Number(query.page ?? 1);

    const limit = Number(query.limit ?? 12);

    const techniqueId = query.techniqueId
      ? Number(query.techniqueId)
      : undefined;

    return this.paintingsService.findAll(page, limit, techniqueId);
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.paintingsService.findOne(Number(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdatePaintingDto,
  ) {
    return this.paintingsService.update(Number(id), dto);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.paintingsService.remove(Number(id));
  }
}
