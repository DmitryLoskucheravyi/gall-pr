import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CartItem } from './entities/cart-item.entity';
import { Painting } from '../paintings/entities/painting.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartRepository: Repository<CartItem>,

    @InjectRepository(Painting)
    private readonly paintingsRepository: Repository<Painting>,
  ) {}

  async getCart(userId: number) {
    const items = await this.cartRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    const total = items.reduce(
      (sum, item) => sum + Number(item.painting.price) * item.quantity,
      0,
    );

    return { items, total };
  }

  async addItem(userId: number, dto: AddCartItemDto): Promise<CartItem> {
    const painting = await this.paintingsRepository.findOne({
      where: { id: dto.paintingId },
    });

    if (!painting) {
      throw new NotFoundException('Painting not found');
    }

    if (!painting.isAvailable) {
      throw new BadRequestException('Painting is not available');
    }

    const quantity = dto.quantity ?? 1;

    let item = await this.cartRepository.findOne({
      where: { userId, paintingId: dto.paintingId },
    });

    if (item) {
      item.quantity = Math.min(item.quantity + quantity, painting.amount);
    } else {
      item = this.cartRepository.create({
        userId,
        paintingId: dto.paintingId,
        quantity: Math.min(quantity, painting.amount),
      });
    }

    return this.cartRepository.save(item);
  }

  async updateItem(
    userId: number,
    paintingId: number,
    quantity: number,
  ): Promise<CartItem> {
    const item = await this.cartRepository.findOne({
      where: { userId, paintingId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity > item.painting.amount) {
      throw new BadRequestException('Not enough stock');
    }

    item.quantity = quantity;

    return this.cartRepository.save(item);
  }

  async removeItem(userId: number, paintingId: number) {
    const item = await this.cartRepository.findOne({
      where: { userId, paintingId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartRepository.remove(item);

    return { message: 'Item removed' };
  }

  async clearCart(userId: number) {
    await this.cartRepository.delete({ userId });

    return { message: 'Cart cleared' };
  }
}
