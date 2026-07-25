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

@Injectable()
export class GiveawaysService {
  constructor(
    @InjectRepository(Giveaway)
    private readonly giveawaysRepository: Repository<Giveaway>,

    @InjectRepository(GiveawayParticipant)
    private readonly participantsRepository: Repository<GiveawayParticipant>,
  ) {}

  private async getEntityOrThrow(id: number): Promise<Giveaway> {
    const giveaway = await this.giveawaysRepository.findOne({
      where: { id },
    });

    if (!giveaway) {
      throw new NotFoundException('Giveaway not found');
    }

    return giveaway;
  }

  private async toSummary(giveaway: Giveaway) {
    const participantsCount = await this.participantsRepository.count({
      where: { giveawayId: giveaway.id },
    });

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

  async create(dto: CreateGiveawayDto) {
    const giveaway = this.giveawaysRepository.create({
      title: dto.title,
      description: dto.description,
      conditions: dto.conditions ?? null,
      paintingId: dto.paintingId,
      deadline: new Date(dto.deadline),
    });

    const saved = await this.giveawaysRepository.save(giveaway);
    return this.toSummary(await this.getEntityOrThrow(saved.id));
  }

  async update(id: number, dto: UpdateGiveawayDto) {
    await this.getEntityOrThrow(id);

    const patch: Partial<Giveaway> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.conditions !== undefined) patch.conditions = dto.conditions;
    if (dto.paintingId !== undefined) patch.paintingId = dto.paintingId;
    if (dto.deadline !== undefined) patch.deadline = new Date(dto.deadline);

    if (Object.keys(patch).length > 0) {
      await this.giveawaysRepository.update(id, patch);
    }

    return this.toSummary(await this.getEntityOrThrow(id));
  }

  async remove(id: number) {
    const giveaway = await this.getEntityOrThrow(id);
    await this.giveawaysRepository.remove(giveaway);
    return { message: 'Giveaway deleted' };
  }

  async findAll() {
    const giveaways = await this.giveawaysRepository.find({
      order: { deadline: 'DESC' },
    });

    return Promise.all(giveaways.map((g) => this.toSummary(g)));
  }

  async findOne(id: number) {
    const giveaway = await this.getEntityOrThrow(id);
    return this.toSummary(giveaway);
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

    await this.participantsRepository.save(
      this.participantsRepository.create({ giveawayId, userId }),
    );

    const participantsCount = await this.participantsRepository.count({
      where: { giveawayId },
    });

    return { joined: true, participantsCount };
  }
}
