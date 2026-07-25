import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { PaintingLike } from './entities/painting-like.entity';
import { Painting } from '../paintings/entities/painting.entity';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(PaintingLike)
    private readonly likesRepository: Repository<PaintingLike>,

    @InjectRepository(Painting)
    private readonly paintingsRepository: Repository<Painting>,

    private readonly dataSource: DataSource,
  ) {}

  async toggleLike(userId: number, paintingId: number) {
    const painting = await this.paintingsRepository.findOne({
      where: { id: paintingId },
    });

    if (!painting) {
      throw new NotFoundException('Painting not found');
    }

    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(PaintingLike, {
        where: { userId, paintingId },
      });

      if (existing) {
        await manager.delete(PaintingLike, { id: existing.id });
        await manager.decrement(Painting, { id: paintingId }, 'likesCount', 1);
      } else {
        await manager.save(
          PaintingLike,
          manager.create(PaintingLike, { userId, paintingId }),
        );
        await manager.increment(Painting, { id: paintingId }, 'likesCount', 1);
      }

      const updated = await manager.findOne(Painting, {
        where: { id: paintingId },
      });

      return { liked: !existing, likesCount: updated?.likesCount ?? 0 };
    });
  }

  async getMyLikedIds(userId: number): Promise<number[]> {
    const likes = await this.likesRepository.find({ where: { userId } });
    return likes.map((like) => like.paintingId);
  }

  async getMyLikedPaintings(userId: number): Promise<Painting[]> {
    const likes = await this.likesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const ids = likes.map((like) => like.paintingId);
    if (ids.length === 0) return [];

    const paintings = await this.paintingsRepository.findBy({ id: In(ids) });
    const paintingsById = new Map(paintings.map((p) => [p.id, p]));

    return ids
      .map((id) => paintingsById.get(id))
      .filter((painting): painting is Painting => !!painting);
  }
}
