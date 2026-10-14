import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import type { Identity } from '../common/identity.util';

const PUBLIC_LIMIT = 24;

// "Олена К." — a first name and an initial: enough to be a person on the
// homepage, not enough to find them by.
function authorFrom(order: Order): string {
  const first =
    order.user?.firstName?.trim() ||
    order.guestName?.trim().split(/\s+/)[0] ||
    '';
  const lastSource =
    order.user?.lastName?.trim() ||
    order.guestName?.trim().split(/\s+/)[1] ||
    '';
  const initial = lastSource ? ` ${lastSource[0].toUpperCase()}.` : '';
  return (first ? `${first}${initial}` : 'Покупець').slice(0, 100);
}

// The work a review is shown beside: the order's first painting.
function paintingOf(order: Order | undefined) {
  const painting = order?.items?.[0]?.painting;
  return painting
    ? {
        id: painting.id,
        title: painting.title,
        titleEn: painting.titleEn ?? null,
        cardImage: painting.cardImage,
      }
    : null;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
  ) {}

  // What the homepage shows: published only, newest first, each with the
  // work it was written about.
  async findPublished() {
    const rows = await this.reviews.find({
      where: { isPublished: true },
      // Eager relations of a joined entity are not loaded for it, so the
      // path to the painting is spelled out.
      relations: { order: { items: { painting: true } } },
      order: { createdAt: 'DESC' },
      take: PUBLIC_LIMIT,
    });

    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      authorName: r.authorName,
      createdAt: r.createdAt,
      painting: paintingOf(r.order),
    }));
  }

  async findAllAdmin() {
    const rows = await this.reviews.find({
      // Eager relations of a joined entity are not loaded for it, so the
      // path to the painting is spelled out.
      relations: { order: { items: { painting: true } } },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      rating: r.rating,
      text: r.text,
      authorName: r.authorName,
      isPublished: r.isPublished,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      painting: paintingOf(r.order),
    }));
  }

  // The customer's one chance: their own order, delivered, not yet reviewed.
  async create(identity: Identity, dto: CreateReviewDto) {
    const order = await this.orders.findOne({
      where: {
        id: dto.orderId,
        ...('userId' in identity
          ? { userId: identity.userId }
          : { guestToken: identity.guestToken }),
      },
      relations: { user: true, review: true },
    });

    // Someone else's order and no order at all look the same from outside.
    if (!order) throw new NotFoundException('Замовлення не знайдено');

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Відгук можна залишити, коли замовлення отримане',
      );
    }
    if (order.review) {
      throw new ConflictException('Відгук до цього замовлення вже є');
    }

    const review = this.reviews.create({
      orderId: order.id,
      userId: order.userId ?? null,
      authorName: authorFrom(order),
      rating: dto.rating,
      text: dto.text.trim(),
      // Waits for the admin: nothing a customer writes goes on the homepage
      // until someone has read it.
      isPublished: false,
    });

    try {
      return await this.reviews.save(review);
    } catch (error) {
      // Two submissions racing past the check above meet the UNIQUE key.
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Відгук до цього замовлення вже є');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateReviewDto) {
    const review = await this.reviews.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Відгук не знайдено');

    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.text !== undefined) review.text = dto.text.trim();
    if (dto.isPublished !== undefined) review.isPublished = dto.isPublished;

    return this.reviews.save(review);
  }

  async remove(id: number) {
    const result = await this.reviews.delete(id);
    if (!result.affected) throw new NotFoundException('Відгук не знайдено');
    return { message: 'Review deleted' };
  }
}
