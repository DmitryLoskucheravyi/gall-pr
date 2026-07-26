import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { News } from './entities/news.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(News)
    private readonly newsRepository: Repository<News>,
  ) {}

  private async getEntityOrThrow(id: number): Promise<News> {
    const news = await this.newsRepository.findOne({ where: { id } });

    if (!news) {
      throw new NotFoundException('News not found');
    }

    return news;
  }

  async create(dto: CreateNewsDto) {
    const news = this.newsRepository.create({
      title: dto.title,
      text: dto.text,
      imageUrl: dto.imageUrl ?? null,
    });

    return this.newsRepository.save(news);
  }

  async update(id: number, dto: UpdateNewsDto) {
    await this.getEntityOrThrow(id);

    const patch: Partial<News> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.text !== undefined) patch.text = dto.text;
    if (dto.imageUrl !== undefined) patch.imageUrl = dto.imageUrl;

    if (Object.keys(patch).length > 0) {
      await this.newsRepository.update(id, patch);
    }

    return this.getEntityOrThrow(id);
  }

  async remove(id: number) {
    const news = await this.getEntityOrThrow(id);
    await this.newsRepository.remove(news);
    return { message: 'News deleted' };
  }

  async findAll() {
    return this.newsRepository.find({ order: { createdAt: 'DESC' } });
  }
}
