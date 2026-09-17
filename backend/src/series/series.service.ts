import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Series } from './entities/series.entity';
import { Painting } from '../paintings/entities/painting.entity';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';

// What the storefront and the admin both read. `paintingsCount` is what makes
// the list useful — a series with nothing in it should look empty rather than
// look the same as every other.
export type SeriesSummary = {
  id: number;
  name: string;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  coverImage: string | null;
  sortOrder: number;
  isPublished: boolean;
  paintingsCount: number;
  createdAt: Date;
  updatedAt: Date;
};

// How many works of a series the showcase row carries. Generous for a row
// anyone will actually scroll, small enough that the page stays light.
const SHOWCASE_PAINTINGS_PER_SERIES = 24;

@Injectable()
export class SeriesService {
  constructor(
    @InjectRepository(Series)
    private readonly seriesRepository: Repository<Series>,

    @InjectRepository(Painting)
    private readonly paintingsRepository: Repository<Painting>,
  ) {}

  // One grouped query for the whole page rather than a COUNT per row — the
  // same shape the giveaways list uses, and for the same reason.
  private async countPaintings(
    seriesIds: number[],
  ): Promise<Map<number, number>> {
    if (seriesIds.length === 0) return new Map();

    const rows = await this.paintingsRepository
      .createQueryBuilder('painting')
      .select('painting.seriesId', 'seriesId')
      .addSelect('COUNT(*)', 'count')
      .where('painting.seriesId IN (:...seriesIds)', { seriesIds })
      .groupBy('painting.seriesId')
      .getRawMany<{ seriesId: number; count: string }>();

    return new Map(
      rows.map((row) => [Number(row.seriesId), Number(row.count)]),
    );
  }

  private toSummary(series: Series, paintingsCount: number): SeriesSummary {
    return {
      id: series.id,
      name: series.name,
      nameEn: series.nameEn,
      description: series.description,
      descriptionEn: series.descriptionEn,
      coverImage: series.coverImage,
      sortOrder: series.sortOrder,
      isPublished: series.isPublished,
      paintingsCount,
      createdAt: series.createdAt,
      updatedAt: series.updatedAt,
    };
  }

  private async summarise(allSeries: Series[]) {
    const counts = await this.countPaintings(allSeries.map((s) => s.id));

    return allSeries.map((series) =>
      this.toSummary(series, counts.get(series.id) ?? 0),
    );
  }

  // The storefront's list: published only, in the artist's own order. id is
  // the tiebreaker, so series sharing a sortOrder don't reshuffle between
  // requests.
  async findAllPublic() {
    const allSeries = await this.seriesRepository.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return this.summarise(allSeries);
  }

  // The storefront's "Серії" view: every published series with the works in
  // it, in one pass — name, then its row of paintings, then the next name.
  //
  // Two queries total, not one per series: the paintings are fetched for the
  // whole set of ids at once and grouped in memory. A row per series would be
  // the same N+1 the giveaways list and the support inbox both had.
  async findAllPublicWithPaintings() {
    const allSeries = await this.seriesRepository.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    if (allSeries.length === 0) return [];

    const paintings = await this.paintingsRepository.find({
      where: { seriesId: In(allSeries.map((series) => series.id)) },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    const bySeries = new Map<number, Painting[]>();

    for (const painting of paintings) {
      if (painting.seriesId === null) continue;

      const row = bySeries.get(painting.seriesId);
      if (row) row.push(painting);
      else bySeries.set(painting.seriesId, [painting]);
    }

    return allSeries.map((series) => {
      const all = bySeries.get(series.id) ?? [];

      return {
        ...this.toSummary(series, all.length),
        // Capped, with the true total already in paintingsCount above: the
        // view is a horizontal row, and a series of two hundred works should
        // not become a two-hundred-card payload on the catalogue page.
        paintings: all.slice(0, SHOWCASE_PAINTINGS_PER_SERIES),
      };
    });
  }

  // The admin's list: everything, unpublished included.
  async findAllAdmin() {
    const allSeries = await this.seriesRepository.find({
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return this.summarise(allSeries);
  }

  private async getEntityOrThrow(id: number): Promise<Series> {
    const series = await this.seriesRepository.findOne({ where: { id } });

    if (!series) {
      throw new NotFoundException('Серію не знайдено');
    }

    return series;
  }

  async findOne(id: number): Promise<SeriesSummary> {
    const series = await this.getEntityOrThrow(id);
    const counts = await this.countPaintings([series.id]);

    return this.toSummary(series, counts.get(series.id) ?? 0);
  }

  async create(dto: CreateSeriesDto): Promise<SeriesSummary> {
    const existing = await this.seriesRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Серія з такою назвою вже існує');
    }

    const series = this.seriesRepository.create({
      name: dto.name,
      nameEn: dto.nameEn ?? null,
      description: dto.description ?? null,
      descriptionEn: dto.descriptionEn ?? null,
      coverImage: dto.coverImage ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isPublished: dto.isPublished ?? true,
    });

    const saved = await this.seriesRepository.save(series);

    return this.toSummary(saved, 0);
  }

  async update(id: number, dto: UpdateSeriesDto): Promise<SeriesSummary> {
    const series = await this.getEntityOrThrow(id);

    if (dto.name && dto.name !== series.name) {
      const existing = await this.seriesRepository.findOne({
        where: { name: dto.name },
      });

      if (existing) {
        throw new BadRequestException('Серія з такою назвою вже існує');
      }
    }

    // Only the keys actually present on the DTO — a PATCH that omits a field
    // must not blank it.
    Object.assign(series, dto);

    const saved = await this.seriesRepository.save(series);
    const counts = await this.countPaintings([saved.id]);

    return this.toSummary(saved, counts.get(saved.id) ?? 0);
  }

  // Deleting a series must never delete the art in it.
  //
  // The paintings are released first — series_id set to null — and only then
  // is the row removed. The column's ON DELETE SET NULL would do the same
  // thing, but doing it here means the behaviour is visible in the code people
  // read rather than only in the schema.
  async remove(id: number) {
    const series = await this.getEntityOrThrow(id);

    const released = await this.paintingsRepository.update(
      { seriesId: series.id },
      { seriesId: null },
    );

    await this.seriesRepository.remove(series);

    return {
      message: 'Серію видалено',
      releasedPaintings: released.affected ?? 0,
    };
  }

  // Assigning works to a series from the series' own screen, rather than
  // opening each painting in turn. Ids that don't exist are simply not moved.
  async setPaintings(id: number, paintingIds: number[]) {
    const series = await this.getEntityOrThrow(id);

    // Everything currently in the series leaves it first, so this is a "these
    // and only these" operation rather than an append.
    await this.paintingsRepository.update(
      { seriesId: series.id },
      { seriesId: null },
    );

    if (paintingIds.length > 0) {
      await this.paintingsRepository.update(
        { id: In(paintingIds) },
        { seriesId: series.id },
      );
    }

    return this.findOne(series.id);
  }
}
