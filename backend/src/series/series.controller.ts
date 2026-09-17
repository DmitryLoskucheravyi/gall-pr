import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { SeriesService } from './series.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { SetSeriesPaintingsDto } from './dto/set-series-paintings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  // Published series only. The admin's own list is a separate route below
  // rather than a flag on this one — a query parameter that widens what you
  // can see is the kind of thing that gets forgotten and left unguarded.
  @Get()
  findAll() {
    return this.seriesService.findAllPublic();
  }

  // The catalogue's "Серії" tab: every published series with its works
  // already attached, so the page needs one request rather than one per
  // series. Declared before the parameterised GET below, like 'admin'.
  @Get('showcase')
  showcase() {
    return this.seriesService.findAllPublicWithPaintings();
  }

  // Declared before the parameterised GET so 'admin' can't be swallowed as an
  // id — the same ordering the settings controller relies on.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin')
  findAllAdmin() {
    return this.seriesService.findAllAdmin();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.seriesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateSeriesDto) {
    return this.seriesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSeriesDto) {
    return this.seriesService.update(id, dto);
  }

  // PUT rather than PATCH: this replaces the series' membership wholesale
  // instead of adding to it.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id/paintings')
  setPaintings(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetSeriesPaintingsDto,
  ) {
    return this.seriesService.setPaintings(id, dto.paintingIds);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.seriesService.remove(id);
  }
}
