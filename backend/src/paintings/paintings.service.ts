import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { Painting } from './entities/painting.entity';
import { CreatePaintingDto } from './dto/create-painting.dto';
import { UpdatePaintingDto } from './dto/update-painting.dto';

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
      throw new BadRequestException('Painting with this title already exists');
    }

    const painting = this.paintingsRepository.create({
      ...dto,
      amount: 1,
      isAvailable: true,
      isFeatured: dto.isFeatured ?? false,
    });

    return this.paintingsRepository.save(painting);
  }

  async findAll(page = 1, limit = 12, techniqueId?: number) {
    const [paintings, total] = await this.paintingsRepository.findAndCount({
      where: techniqueId ? { techniqueId } : {},
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: paintings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  async findOne(id: number): Promise<Painting> {
    const painting = await this.paintingsRepository.findOne({ where: { id } });

    if (!painting) {
      throw new NotFoundException('Painting not found');
    }

    return painting;
  }

  async update(id: number, dto: UpdatePaintingDto): Promise<Painting> {
    const painting = await this.paintingsRepository.findOne({ where: { id } });

    if (!painting) {
      throw new NotFoundException('Painting not found');
    }

    if (dto.title && dto.title !== painting.title) {
      const existingPainting = await this.paintingsRepository.findOne({
        where: { title: dto.title },
      });

      if (existingPainting) {
        throw new BadRequestException(
          'Painting with this title already exists',
        );
      }
    }

    Object.assign(painting, dto);

    return this.paintingsRepository.save(painting);
  }

  async remove(id: number) {
    const painting = await this.paintingsRepository.findOne({ where: { id } });

    if (!painting) {
      throw new NotFoundException('Painting not found');
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

    return { message: 'Painting deleted' };
  }
}
