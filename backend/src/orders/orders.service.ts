import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Painting } from '../paintings/entities/painting.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    @InjectRepository(CartItem)
    private readonly cartRepository: Repository<CartItem>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async checkout(userId: number): Promise<Order> {
    const cartItems = await this.cartRepository.find({ where: { userId } });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    return this.dataSource.transaction(async (manager) => {
      const orderItems: OrderItem[] = [];
      let total = 0;

      for (const cartItem of cartItems) {
        const painting = await manager.findOne(Painting, {
          where: { id: cartItem.paintingId },
        });

        if (
          !painting ||
          !painting.isAvailable ||
          painting.amount < cartItem.quantity
        ) {
          throw new BadRequestException(
            `"${painting?.title ?? 'Картина'}" більше недоступна в потрібній кількості`,
          );
        }

        orderItems.push(
          manager.create(OrderItem, {
            paintingId: painting.id,
            quantity: cartItem.quantity,
            price: painting.price,
          }),
        );

        total += Number(painting.price) * cartItem.quantity;

        painting.amount -= cartItem.quantity;
        if (painting.amount <= 0) {
          painting.amount = 0;
          painting.isAvailable = false;
        }

        await manager.save(painting);
      }

      const order = manager.create(Order, {
        userId,
        status: OrderStatus.PENDING,
        total,
        items: orderItems,
      });

      const savedOrder = await manager.save(order);

      await manager.delete(CartItem, { userId });

      return savedOrder;
    });
  }

  async cancel(userId: number, id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('Completed orders cannot be cancelled');
    }

    return this.dataSource.transaction(async (manager) => {
      for (const item of order.items) {
        const painting = await manager.findOne(Painting, {
          where: { id: item.paintingId },
        });

        if (painting) {
          painting.amount += item.quantity;
          painting.isAvailable = true;
          await manager.save(painting);
        }
      }

      order.status = OrderStatus.CANCELLED;

      return manager.save(order);
    });
  }

  findAllForUser(userId: number): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: number, id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findAllAdmin() {
    const orders = await this.ordersRepository.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => ({
      ...order,
      user: order.user
        ? {
            id: order.user.id,
            email: order.user.email,
            firstName: order.user.firstName,
            lastName: order.user.lastName,
            phone: order.user.phone,
          }
        : null,
    }));
  }

  async updateStatusAdmin(id: number, status: OrderStatus): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === status) {
      return order;
    }

    const wasCancelled = order.status === OrderStatus.CANCELLED;
    const willBeCancelled = status === OrderStatus.CANCELLED;

    if (!wasCancelled && willBeCancelled) {
      return this.dataSource.transaction(async (manager) => {
        for (const item of order.items) {
          const painting = await manager.findOne(Painting, {
            where: { id: item.paintingId },
          });

          if (painting) {
            painting.amount += item.quantity;
            painting.isAvailable = true;
            await manager.save(painting);
          }
        }

        order.status = status;

        return manager.save(order);
      });
    }

    if (wasCancelled && !willBeCancelled) {
      return this.dataSource.transaction(async (manager) => {
        const paintings = new Map<number, Painting>();

        for (const item of order.items) {
          const painting = await manager.findOne(Painting, {
            where: { id: item.paintingId },
          });

          if (!painting || painting.amount < item.quantity) {
            throw new BadRequestException(
              `"${painting?.title ?? 'Картина'}" більше недоступна в потрібній кількості`,
            );
          }

          paintings.set(item.paintingId, painting);
        }

        for (const item of order.items) {
          const painting = paintings.get(item.paintingId)!;

          painting.amount -= item.quantity;
          if (painting.amount <= 0) {
            painting.amount = 0;
            painting.isAvailable = false;
          }

          await manager.save(painting);
        }

        order.status = status;

        return manager.save(order);
      });
    }

    order.status = status;

    return this.ordersRepository.save(order);
  }

  async removeAdmin(id: number) {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.CANCELLED) {
      throw new BadRequestException('Only cancelled orders can be deleted');
    }

    await this.ordersRepository.remove(order);

    return { message: 'Order deleted' };
  }
}
