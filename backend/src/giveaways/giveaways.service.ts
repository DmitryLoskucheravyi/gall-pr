import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Giveaway } from './entities/giveaway.entity';
import { GiveawayParticipant } from './entities/giveaway-participant.entity';
import { CreateGiveawayDto } from './dto/create-giveaway.dto';
import { UpdateGiveawayDto } from './dto/update-giveaway.dto';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class GiveawaysService {
  constructor(
    @InjectRepository(Giveaway)
    private readonly giveawaysRepository: Repository<Giveaway>,

    @InjectRepository(GiveawayParticipant)
    private readonly participantsRepository: Repository<GiveawayParticipant>,

    private readonly telegramService: TelegramService,
  ) {}

  private async getEntityOrThrow(id: number): Promise<Giveaway> {
    const giveaway = await this.giveawaysRepository.findOne({ where: { id } });

    if (!giveaway) {
      throw new NotFoundException('Розіграш не знайдено');
    }

    return giveaway;
  }

  // Takes the count rather than fetching one, so a list of giveaways is one
  // grouped query instead of a COUNT(*) per row — see countParticipants().
  private toSummary(giveaway: Giveaway, participantsCount: number) {
    return {
      id: giveaway.id,
      title: giveaway.title,
      description: giveaway.description,
      conditions: giveaway.conditions,
      painting: giveaway.painting,
      deadline: giveaway.deadline,
      isActive: giveaway.deadline.getTime() > Date.now(),
      participantsCount,
      createdAt: giveaway.createdAt,
      updatedAt: giveaway.updatedAt,
    };
  }

  // One grouped query for however many giveaways are on the page. findAll()
  // used to call count() once per row, which is fine at three giveaways and
  // silly at thirty — and it was the same shape of N+1 as the support inbox.
  private async countParticipants(
    giveawayIds: number[],
  ): Promise<Map<number, number>> {
    if (giveawayIds.length === 0) return new Map();

    const rows = await this.participantsRepository
      .createQueryBuilder('participant')
      .select('participant.giveawayId', 'giveawayId')
      .addSelect('COUNT(*)', 'count')
      .where('participant.giveawayId IN (:...giveawayIds)', { giveawayIds })
      .groupBy('participant.giveawayId')
      .getRawMany<{ giveawayId: number; count: string }>();

    return new Map(
      rows.map((row) => [Number(row.giveawayId), Number(row.count)]),
    );
  }

  private async summarise(giveaway: Giveaway) {
    const counts = await this.countParticipants([giveaway.id]);

    return this.toSummary(giveaway, counts.get(giveaway.id) ?? 0);
  }

  async create(dto: CreateGiveawayDto) {
    const giveaway = this.giveawaysRepository.create({
      title: dto.title,
      titleEn: dto.titleEn ?? null,
      description: dto.description,
      descriptionEn: dto.descriptionEn ?? null,
      conditions: dto.conditions ?? null,
      conditionsEn: dto.conditionsEn ?? null,
      paintingId: dto.paintingId,
      deadline: new Date(dto.deadline),
    });

    const saved = await this.giveawaysRepository.save(giveaway);
    return this.summarise(await this.getEntityOrThrow(saved.id));
  }

  async update(id: number, dto: UpdateGiveawayDto) {
    await this.getEntityOrThrow(id);

    const patch: Partial<Giveaway> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.titleEn !== undefined) patch.titleEn = dto.titleEn;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.descriptionEn !== undefined)
      patch.descriptionEn = dto.descriptionEn;
    if (dto.conditions !== undefined) patch.conditions = dto.conditions;
    if (dto.conditionsEn !== undefined) patch.conditionsEn = dto.conditionsEn;
    if (dto.paintingId !== undefined) patch.paintingId = dto.paintingId;
    if (dto.deadline !== undefined) patch.deadline = new Date(dto.deadline);

    if (Object.keys(patch).length > 0) {
      await this.giveawaysRepository.update(id, patch);
    }

    return this.summarise(await this.getEntityOrThrow(id));
  }

  async remove(id: number) {
    const giveaway = await this.getEntityOrThrow(id);
    await this.giveawaysRepository.remove(giveaway);
    return { message: 'Розіграш видалено' };
  }

  async findAll() {
    const giveaways = await this.giveawaysRepository.find({
      order: { deadline: 'DESC' },
    });

    const counts = await this.countParticipants(giveaways.map((g) => g.id));

    return giveaways.map((giveaway) =>
      this.toSummary(giveaway, counts.get(giveaway.id) ?? 0),
    );
  }

  async findOne(id: number) {
    return this.summarise(await this.getEntityOrThrow(id));
  }

  async hasJoined(giveawayId: number, userId: number) {
    const existing = await this.participantsRepository.findOne({
      where: { giveawayId, userId },
    });

    return { joined: !!existing };
  }

  async join(giveawayId: number, userId: number) {
    const giveaway = await this.getEntityOrThrow(giveawayId);

    if (giveaway.deadline.getTime() <= Date.now()) {
      throw new BadRequestException('Розіграш вже завершено');
    }

    const existing = await this.participantsRepository.findOne({
      where: { giveawayId, userId },
    });

    if (existing) {
      throw new BadRequestException('Ви вже берете участь у цьому розіграші');
    }

    // Check-then-insert races with itself — a double-clicked button is two
    // requests that both see nothing. giveaway_participants has a unique index
    // on (giveaway_id, user_id), so the loser is caught here and answered the
    // same way as the ordinary "already joined" case rather than as a 500.
    try {
      await this.participantsRepository.save(
        this.participantsRepository.create({ giveawayId, userId }),
      );
    } catch (error) {
      const alreadyIn = await this.participantsRepository.findOne({
        where: { giveawayId, userId },
      });

      if (!alreadyIn) throw error;

      throw new BadRequestException('Ви вже берете участь у цьому розіграші');
    }

    const participantsCount = await this.participantsRepository.count({
      where: { giveawayId },
    });

    this.telegramService
      .notifyUser(
        userId,
        `🎁 Ви приєднались до розіграшу «${giveaway.title}»! Переможця оберемо ${giveaway.deadline.toLocaleDateString('uk-UA')}.`,
      )
      .catch(() => {});

    return { joined: true, participantsCount };
  }
}
