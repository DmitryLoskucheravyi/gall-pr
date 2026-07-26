import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

import { CartItem } from './entities/cart-item.entity';
import { Painting } from '../paintings/entities/painting.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { Identity } from '../common/identity.util';

function identityWhere(identity: Identity): FindOptionsWhere<CartItem> {
  return 'userId' in identity
    ? { userId: identity.userId }
    : { guestToken: identity.guestToken };
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartRepository: Repository<CartItem>,

    @InjectRepository(Painting)
    private readonly paintingsRepository: Repository<Painting>,
  ) {}

  async getCart(identity: Identity) {
    const items = await this.cartRepository.find({
      where: identityWhere(identity),
      order: { createdAt: 'ASC' },
    });

    const total = items.reduce(
      (sum, item) => sum + Number(item.painting.price) * item.quantity,
      0,
    );

    return { items, total };
  }

  async addItem(identity: Identity, dto: AddCartItemDto): Promise<CartItem> {
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
      where: { ...identityWhere(identity), paintingId: dto.paintingId },
    });

    if (item) {
      item.quantity = Math.min(item.quantity + quantity, painting.amount);
    } else {
      item = this.cartRepository.create({
        userId: 'userId' in identity ? identity.userId : null,
        guestToken: 'guestToken' in identity ? identity.guestToken : null,
        paintingId: dto.paintingId,
        quantity: Math.min(quantity, painting.amount),
      });
    }

    return this.cartRepository.save(item);
  }

  async updateItem(
    identity: Identity,
    paintingId: number,
    quantity: number,
  ): Promise<CartItem> {
    const item = await this.cartRepository.findOne({
      where: { ...identityWhere(identity), paintingId },
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

  async removeItem(identity: Identity, paintingId: number) {
    const item = await this.cartRepository.findOne({
      where: { ...identityWhere(identity), paintingId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartRepository.remove(item);

    return { message: 'Item removed' };
  }

  async clearCart(identity: Identity) {
    await this.cartRepository.delete(identityWhere(identity));

    return { message: 'Cart cleared' };
  }

  async mergeGuestCart(userId: number, guestToken: string) {
    const guestItems = await this.cartRepository.find({
      where: { guestToken },
    });

    for (const guestItem of guestItems) {
      const existing = await this.cartRepository.findOne({
        where: { userId, paintingId: guestItem.paintingId },
      });

      if (existing) {
        existing.quantity = Math.min(
          existing.quantity + guestItem.quantity,
          existing.painting.amount,
        );
        await this.cartRepository.save(existing);
        await this.cartRepository.remove(guestItem);
      } else {
        guestItem.userId = userId;
        guestItem.guestToken = null;
        await this.cartRepository.save(guestItem);
      }
    }

    return { message: 'Cart merged' };
  }
}
