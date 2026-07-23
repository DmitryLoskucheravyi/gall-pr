import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Technique } from './entities/technique.entity';
import { CreateTechniqueDto } from './dto/create-technique.dto';
import { UpdateTechniqueDto } from './dto/update-technique.dto';

@Injectable()
export class TechniquesService {
  constructor(
    @InjectRepository(Technique)
    private readonly techniquesRepository: Repository<Technique>,
  ) {}

  async create(dto: CreateTechniqueDto): Promise<Technique> {
    const existing = await this.techniquesRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Technique with this name already exists');
    }

    const technique = this.techniquesRepository.create(dto);

    return this.techniquesRepository.save(technique);
  }

  findAll(): Promise<Technique[]> {
    return this.techniquesRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Technique> {
    const technique = await this.techniquesRepository.findOne({
      where: { id },
    });

    if (!technique) {
      throw new NotFoundException('Technique not found');
    }

    return technique;
  }

  async update(id: number, dto: UpdateTechniqueDto): Promise<Technique> {
    const technique = await this.findOne(id);

    Object.assign(technique, dto);

    return this.techniquesRepository.save(technique);
  }

  async remove(id: number) {
    const technique = await this.findOne(id);

    await this.techniquesRepository.remove(technique);

    return { message: 'Technique deleted' };
  }
}
