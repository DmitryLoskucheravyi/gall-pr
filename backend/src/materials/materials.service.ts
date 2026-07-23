import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Material } from './entities/material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private readonly materialsRepository: Repository<Material>,
  ) {}

  async create(dto: CreateMaterialDto): Promise<Material> {
    const existing = await this.materialsRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Material with this name already exists');
    }

    const material = this.materialsRepository.create(dto);

    return this.materialsRepository.save(material);
  }

  findAll(): Promise<Material[]> {
    return this.materialsRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Material> {
    const material = await this.materialsRepository.findOne({
      where: { id },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return material;
  }

  async update(id: number, dto: UpdateMaterialDto): Promise<Material> {
    const material = await this.findOne(id);

    Object.assign(material, dto);

    return this.materialsRepository.save(material);
  }

  async remove(id: number) {
    const material = await this.findOne(id);

    await this.materialsRepository.remove(material);

    return { message: 'Material deleted' };
  }
}
