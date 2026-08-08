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

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

// Keeps a non-numeric, missing or out-of-range value from reaching the query
// builder, falling back to the default rather than rejecting the request — a
// catalogue link with a stale ?page= shouldn't be an error page.
function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

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
    // IsNumberString lets through "0" and "-5" as happily as "1000000", and
    // findAll() feeds these straight into skip/take: an unbounded limit reads
    // the whole table into memory, and page 0 computes a negative offset the
    // driver rejects outright.
    const page = clampInt(query.page, 1, 1, Number.MAX_SAFE_INTEGER);

    const limit = clampInt(query.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);

    const techniqueId = query.techniqueId
      ? Number(query.techniqueId)
      : undefined;

    const isAvailable =
      query.isAvailable === undefined
        ? undefined
        : query.isAvailable === 'true';

    const minPrice =
      query.minPrice !== undefined ? Number(query.minPrice) : undefined;
    const maxPrice =
      query.maxPrice !== undefined ? Number(query.maxPrice) : undefined;

    return this.paintingsService.findAll(
      page,
      limit,
      techniqueId,
      isAvailable,
      minPrice,
      maxPrice,
    );
  }

  @Get('price-range')
  getPriceRange() {
    return this.paintingsService.getPriceRange();
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
