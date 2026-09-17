import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsOrder,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  QueryFailedError,
  Repository,
} from 'typeorm';

import { Painting } from './entities/painting.entity';
import {
  CreatePaintingDto,
  INTERIOR_IMAGES_MAX,
  INTERIOR_IMAGES_MIN,
} from './dto/create-painting.dto';
import { UpdatePaintingDto } from './dto/update-painting.dto';

export const PAINTING_SORTS = [
  'newest',
  'oldest',
  'priceAsc',
  'priceDesc',
  'popular',
] as const;
export type PaintingSort = (typeof PAINTING_SORTS)[number];

const PAINTING_ORDER: Record<PaintingSort, FindOptionsOrder<Painting>> = {
  newest: { createdAt: 'DESC' },
  oldest: { createdAt: 'ASC' },
  priceAsc: { price: 'ASC' },
  priceDesc: { price: 'DESC' },
  popular: { likesCount: 'DESC' },
};

// Empty (or absent) means the painting has no interior section at all, which
// is the normal case. Anything else has to be a sequence worth playing — a
// single photo isn't a carousel, it's a photo that happens to auto-advance to
// itself. The upper bound is in the DTO; this is the part it can't express
// without also rejecting the empty array.
function assertInteriorImageCount(images: string[] | undefined): void {
  if (!images || images.length === 0) return;

  if (images.length < INTERIOR_IMAGES_MIN) {
    throw new BadRequestException(
      `Фото в інтер'єрі: додайте щонайменше ${INTERIOR_IMAGES_MIN}, або жодного`,
    );
  }

  if (images.length > INTERIOR_IMAGES_MAX) {
    throw new BadRequestException(
      `Фото в інтер'єрі: не більше ${INTERIOR_IMAGES_MAX}`,
    );
  }
}

// `amount` and `isAvailable` describe the same fact from two directions, and
// they are settable independently, so one place decides what the pair means:
// nothing with no copies is for sale, and a restock is for sale again unless
// the admin says otherwise in the same breath.
function reconcileAvailability(
  amount: number,
  requested: boolean | undefined,
): boolean {
  if (amount <= 0) return false;

  return requested ?? true;
}

@Injectable()
export class PaintingsService {
  constructor(
    @InjectRepository(Painting)
    private readonly paintingsRepository: Repository<Painting>,
  ) {}

  async create(dto: CreatePaintingDto): Promise<Painting> {
    const existingPainting = await this.paintingsRepository.findOne({
      where: { title: dto.title },
    });

    if (existingPainting) {
      throw new BadRequestException('Картина з такою назвою вже існує');
    }

    assertInteriorImageCount(dto.interiorImages);

    // One copy unless told otherwise — the gallery's normal case — but it is a
    // default now rather than a hard-coded 1 that ignored what was sent.
    const amount = dto.amount ?? 1;

    const painting = this.paintingsRepository.create({
      ...dto,
      amount,
      isAvailable: reconcileAvailability(amount, dto.isAvailable),
      isFeatured: dto.isFeatured ?? false,
      // Stored as null rather than [] so "no interior section" is one value in
      // the column, not two that mean the same thing.
      interiorImages: dto.interiorImages?.length ? dto.interiorImages : null,
    });

    return this.paintingsRepository.save(painting);
  }

  async findAll(
    page = 1,
    limit = 12,
    techniqueId?: number,
    isAvailable?: boolean,
    minPrice?: number,
    maxPrice?: number,
    materialId?: number,
    sort: PaintingSort = 'newest',
    seriesId?: number,
  ) {
    const where: FindOptionsWhere<Painting> = {};
    if (techniqueId) where.techniqueId = techniqueId;
    // The column, the entity and the admin form all had a material — only the
    // catalogue query didn't, so filtering by one silently returned everything.
    if (materialId) where.materialId = materialId;
    if (seriesId) where.seriesId = seriesId;
    if (isAvailable !== undefined) where.isAvailable = isAvailable;

    if (minPrice !== undefined && maxPrice !== undefined) {
      where.price = Between(minPrice, maxPrice);
    } else if (minPrice !== undefined) {
      where.price = MoreThanOrEqual(minPrice);
    } else if (maxPrice !== undefined) {
      where.price = LessThanOrEqual(maxPrice);
    }

    const [paintings, total] = await this.paintingsRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      // id as the tiebreaker on every ordering: created_at has second
      // granularity, and a batch of paintings added together would otherwise
      // come back in whatever order the engine felt like — which means a work
      // can appear on both page 1 and page 2, or on neither.
      order: { ...PAINTING_ORDER[sort], id: 'DESC' },
    });

    return {
      data: paintings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  async getPriceRange(): Promise<{ min: number; max: number }> {
    const result = await this.paintingsRepository
      .createQueryBuilder('painting')
      .select('MIN(painting.price)', 'min')
      .addSelect('MAX(painting.price)', 'max')
      .getRawOne<{ min: string | null; max: string | null }>();

    return {
      min: result?.min ? Number(result.min) : 0,
      max: result?.max ? Number(result.max) : 0,
    };
  }

  async findOne(id: number): Promise<Painting> {
    const painting = await this.paintingsRepository.findOne({ where: { id } });

    if (!painting) {
      throw new NotFoundException('Картину не знайдено');
    }

    return painting;
  }

  async update(id: number, dto: UpdatePaintingDto): Promise<Painting> {
    const painting = await this.paintingsRepository.findOne({ where: { id } });

    if (!painting) {
      throw new NotFoundException('Картину не знайдено');
    }

    if (dto.title && dto.title !== painting.title) {
      const existingPainting = await this.paintingsRepository.findOne({
        where: { title: dto.title },
      });

      if (existingPainting) {
        throw new BadRequestException('Картина з такою назвою вже існує');
      }
    }

    assertInteriorImageCount(dto.interiorImages);

    Object.assign(painting, dto);

    // Only when the caller actually sent the field — a PATCH that leaves it
    // out must not clear an interior sequence someone set earlier.
    if (dto.interiorImages !== undefined) {
      painting.interiorImages = dto.interiorImages.length
        ? dto.interiorImages
        : null;
    }

    // Restocking is what puts a sold-out work back on the shelf, so an admin
    // raising `amount` without also remembering to flip `isAvailable` should
    // still end up with something buyable — and nothing with no copies left
    // may claim to be available, whatever was sent.
    painting.isAvailable = reconcileAvailability(
      painting.amount,
      dto.isAvailable ?? painting.isAvailable,
    );

    return this.paintingsRepository.save(painting);
  }

  async remove(id: number) {
    const painting = await this.paintingsRepository.findOne({ where: { id } });

    if (!painting) {
      throw new NotFoundException('Картину не знайдено');
    }

    try {
      await this.paintingsRepository.remove(painting);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code ===
          'ER_ROW_IS_REFERENCED_2'
      ) {
        throw new BadRequestException(
          'Неможливо видалити картину: вона є в замовленнях клієнтів',
        );
      }

      throw error;
    }

    return { message: 'Картину видалено' };
  }
}
