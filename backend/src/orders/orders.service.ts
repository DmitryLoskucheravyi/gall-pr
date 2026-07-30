import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  DeliveryMethod,
  Order,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Painting } from '../paintings/entities/painting.entity';
import { CheckoutDto } from './dto/checkout.dto';
import { Identity } from '../common/identity.util';
import { PaymentsService } from '../payments/payments.service';
import { NovaPoshtaService } from '../nova-poshta/nova-poshta.service';
import type { PaymentInitResult } from '../payments/gateways/payment-gateway.interface';

// Shared by both CartItem and Order lookups — both entities key guest rows
// by the same guestToken column, so one where-clause builder covers both.
function identityWhere(identity: Identity) {
  return 'userId' in identity
    ? { userId: identity.userId }
    : { guestToken: identity.guestToken };
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    @InjectRepository(CartItem)
    private readonly cartRepository: Repository<CartItem>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    private readonly paymentsService: PaymentsService,
    private readonly novaPoshtaService: NovaPoshtaService,
  ) {}

  async checkout(
    identity: Identity,
    dto: CheckoutDto,
  ): Promise<Order & { paymentForm: PaymentInitResult | null }> {
    const isGuest = !('userId' in identity);

    if (isGuest && (!dto.guestName?.trim() || !dto.guestPhone?.trim())) {
      throw new BadRequestException(
        "Вкажіть ім'я та телефон для оформлення замовлення",
      );
    }

    if (
      dto.deliveryMethod === DeliveryMethod.NOVA_POSHTA &&
      (!dto.novaPoshtaCity?.trim() || !dto.novaPoshtaWarehouse?.trim())
    ) {
      throw new BadRequestException('Оберіть місто та відділення Нової пошти');
    }

    const cartWhere = identityWhere(identity);
    const cartItems = await this.cartRepository.find({ where: cartWhere });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Delivery/COD price is always computed here, server-side, from the
    // current cart and settings — the client only picks the recipient city,
    // it never gets to influence the actual fee.
    let deliveryCost = 0;
    let codFee = 0;

    if (dto.deliveryMethod === DeliveryMethod.NOVA_POSHTA && dto.novaPoshtaCityRef) {
      const price = await this.novaPoshtaService.calculateDeliveryPriceForCartItems(
        cartItems,
        dto.novaPoshtaCityRef,
        dto.paymentProvider === PaymentProvider.CASH_ON_DELIVERY,
      );

      if (price) {
        deliveryCost = price.shippingCost;
        codFee = price.redeliveryCost;
      }
    }

    const savedOrder = await this.dataSource.transaction(async (manager) => {
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

      total += deliveryCost + codFee;

      const order = manager.create(Order, {
        userId: isGuest ? null : (identity as { userId: number }).userId,
        guestToken: isGuest ? (identity as { guestToken: string }).guestToken : null,
        guestName: isGuest ? dto.guestName : null,
        guestEmail: isGuest ? dto.guestEmail : null,
        guestPhone: isGuest ? dto.guestPhone : null,
        guestAddress: isGuest ? dto.guestAddress : null,
        comment: dto.comment?.trim() || null,
        status: OrderStatus.PENDING,
        paymentProvider: dto.paymentProvider,
        deliveryMethod: dto.deliveryMethod,
        callMeRequested: dto.callMeRequested ?? false,
        novaPoshtaCity: dto.novaPoshtaCity?.trim() || null,
        novaPoshtaWarehouse: dto.novaPoshtaWarehouse?.trim() || null,
        deliveryCost,
        codFee,
        total,
        items: orderItems,
      });

      const savedOrder = await manager.save(order);

      await manager.delete(CartItem, cartWhere);

      return savedOrder;
    });

    return {
      ...savedOrder,
      paymentForm: this.paymentsService.createPayment(savedOrder),
    };
  }

  async cancel(identity: Identity, id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, ...identityWhere(identity) },
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

  findAllForIdentity(identity: Identity): Promise<Order[]> {
    return this.ordersRepository.find({
      where: identityWhere(identity),
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(identity: Identity, id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, ...identityWhere(identity) },
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

  async updatePaymentStatusAdmin(
    id: number,
    paymentStatus: PaymentStatus,
  ): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.paymentStatus = paymentStatus;

    return this.ordersRepository.save(order);
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
