import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { readFile } from 'fs/promises';

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
import { UsersService } from '../users/users.service';
import { TelegramService } from '../telegram/telegram.service';
import { UploadsService } from '../uploads/uploads.service';
import { MailService, type OrderMailData } from '../mail/mail.service';
import { SettingsService } from '../settings/settings.service';
import type { PaymentInitResult } from '../payments/gateways/payment-gateway.interface';

const PAYMENT_PROVIDER_LABEL: Record<PaymentProvider, string> = {
  [PaymentProvider.LIQPAY]: 'LiqPay',
  [PaymentProvider.WAYFORPAY]: 'WayForPay',
  [PaymentProvider.CASH_ON_DELIVERY]: 'Оплата при отриманні',
  [PaymentProvider.CARD_TRANSFER]: 'Переказ на карту',
};

const ORDER_STATUS_MESSAGE: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'очікує на обробку',
  [OrderStatus.CONFIRMED]: 'підтверджено. Ми готуємо його до відправки',
  [OrderStatus.SHIPPED]: 'відправлено! Перевірте статус посилки в застосунку Нової пошти',
  [OrderStatus.CANCELLED]: 'скасовано',
  [OrderStatus.COMPLETED]: 'виконано. Дякуємо за покупку!',
};

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
    private readonly usersService: UsersService,
    private readonly telegramService: TelegramService,
    private readonly uploadsService: UploadsService,
    private readonly mailService: MailService,
    private readonly settingsService: SettingsService,
  ) {}

  async checkout(
    identity: Identity,
    dto: CheckoutDto,
  ): Promise<Order & { paymentForm: PaymentInitResult | null }> {
    const isGuest = !('userId' in identity);

    // Email carries every update a guest will get about this order, so it's
    // as required as the name and phone.
    if (isGuest && !dto.guestEmail?.trim()) {
      throw new BadRequestException('Вкажіть email — надішлемо туди замовлення');
    }

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

    this.notifyAdminOfNewOrder(savedOrder.id).catch(() => {});
    this.emailOrderPlaced(savedOrder.id).catch(() => {});

    return {
      ...savedOrder,
      paymentForm: this.paymentsService.createPayment(savedOrder),
    };
  }

  // Re-fetches by id (rather than using the freshly-saved entity) so eager
  // relations — items → painting — are actually populated: save() returns
  // what you gave it, it doesn't hydrate eager relations the way find() does.
  // Email is the one channel that reaches everyone: Telegram only works for
  // account holders who linked the bot, and guests have no account at all.
  private async recipientOf(
    order: Order,
  ): Promise<{ email: string; name: string | null } | null> {
    if (order.userId) {
      const user = await this.usersService.findById(order.userId);
      return user?.email
        ? { email: user.email, name: user.firstName ?? null }
        : null;
    }
    return order.guestEmail
      ? { email: order.guestEmail, name: order.guestName ?? null }
      : null;
  }

  private deliveryPlaceOf(order: Order): string | null {
    if (order.deliveryMethod !== DeliveryMethod.NOVA_POSHTA) return null;
    return `Нова пошта, ${order.novaPoshtaCity ?? '—'} — ${order.novaPoshtaWarehouse ?? '—'}`;
  }

  private toMailData(order: Order, name: string | null): OrderMailData {
    return {
      id: order.id,
      customerName: name,
      items: (order.items ?? []).map((item) => ({
        title: item.painting?.title ?? `Картина #${item.paintingId}`,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      total: Number(order.total),
      deliveryCost: Number(order.deliveryCost),
      codFee: Number(order.codFee),
      deliveryPlace: this.deliveryPlaceOf(order),
      paymentLabel: PAYMENT_PROVIDER_LABEL[order.paymentProvider],
      comment: order.comment,
    };
  }

  // Every mail is fire-and-forget: an order is placed, paid or shipped
  // whether or not its notification leaves the building.
  private async emailOrderPlaced(orderId: number) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) return;

    const recipient = await this.recipientOf(order);
    if (!recipient) return;

    // A card transfer needs somewhere to send the money, and this receipt is
    // the only place the customer is given it.
    const iban =
      order.paymentProvider === PaymentProvider.CARD_TRANSFER
        ? (await this.settingsService.get()).cardTransferIban || null
        : null;

    await this.mailService.sendOrderPlaced(
      recipient.email,
      this.toMailData(order, recipient.name),
      iban,
    );
  }

  private async emailPaymentProofReceived(order: Order) {
    const recipient = await this.recipientOf(order);
    if (!recipient) return;

    await this.mailService.sendPaymentProofReceived(recipient.email, order.id);
  }

  private async notifyAdminOfNewOrder(orderId: number) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) return;

    let buyer: string;
    if (order.userId) {
      const user = await this.usersService.findById(order.userId);
      buyer = user
        ? `${user.firstName} ${user.lastName}\n📧 ${user.email}\n📞 ${user.phone}`
        : `Користувач #${order.userId}`;
    } else {
      buyer = [
        `${order.guestName} (гість)`,
        order.guestPhone ? `📞 ${order.guestPhone}` : null,
        order.guestEmail ? `📧 ${order.guestEmail}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    }

    const itemsList = order.items
      .map((item) => {
        const title = item.painting?.title ?? `Картина #${item.paintingId}`;
        const lineTotal = (Number(item.price) * item.quantity).toLocaleString('uk-UA');
        return `• ${title} × ${item.quantity} — ${lineTotal} ₴`;
      })
      .join('\n');

    const deliveryCost = Number(order.deliveryCost);
    const codFee = Number(order.codFee);

    const deliveryLine =
      order.deliveryMethod === DeliveryMethod.NOVA_POSHTA
        ? `Нова пошта, ${order.novaPoshtaCity ?? '—'} — ${order.novaPoshtaWarehouse ?? '—'}`
        : order.deliveryMethod;

    const lines = [
      `🛒 Нове замовлення №${order.id}`,
      '',
      buyer,
      order.guestAddress ? `🏠 ${order.guestAddress}` : null,
      '',
      itemsList,
      '',
      `Доставка: ${deliveryLine}`,
      deliveryCost > 0 ? `Вартість доставки: ${deliveryCost.toLocaleString('uk-UA')} ₴` : null,
      codFee > 0
        ? `Комісія за накладений платіж: ${codFee.toLocaleString('uk-UA')} ₴`
        : null,
      `Оплата: ${PAYMENT_PROVIDER_LABEL[order.paymentProvider]}`,
      order.callMeRequested ? '☎️ Просив(ла) зателефонувати' : null,
      order.comment ? `Коментар: ${order.comment}` : null,
      '',
      `Сума: ${Number(order.total).toLocaleString('uk-UA')} ₴`,
    ].filter((line): line is string => line !== null);

    await this.telegramService.notifyAdmin(lines.join('\n'));
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

    const updated = await this.dataSource.transaction(async (manager) => {
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

    // Cancelling from the cabinet ends up in the same place as an admin
    // cancellation, so it deserves the same confirmation — a cancel that
    // acknowledges nothing leaves the customer unsure it went through.
    this.notifyUserOfStatusChange(updated).catch(() => {});

    return updated;
  }

  async uploadPaymentProof(
    identity: Identity,
    id: number,
    file: Express.Multer.File,
  ): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, ...identityWhere(identity) },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentProvider !== PaymentProvider.CARD_TRANSFER) {
      throw new BadRequestException(
        'Скріншот оплати можна додати лише для переказу на карту',
      );
    }

    // Read the temp file into memory before uploadImage deletes it — the
    // Telegram send below needs the raw bytes, not just the Cloudinary URL.
    const proofBuffer = await readFile(file.path);

    const { url } = await this.uploadsService.uploadImage(file);
    order.paymentProofUrl = url;
    const updated = await this.ordersRepository.save(order);

    const buyer = order.userId
      ? (await this.usersService.findById(order.userId))?.email ?? `Користувач #${order.userId}`
      : `${order.guestName} (гість)`;

    this.telegramService
      .notifyAdmin(
        `💳 Скріншот оплати до замовлення №${order.id}\n${buyer}\nСума: ${Number(order.total).toLocaleString('uk-UA')} ₴`,
        proofBuffer,
      )
      .catch(() => {});

    // The screenshot only reaches the admin's Telegram, so without this the
    // customer is left with money gone and nothing acknowledging it until
    // someone gets around to checking the transfer. Confirmation itself comes
    // later, from updatePaymentStatusAdmin.
    this.emailPaymentProofReceived(order).catch(() => {});

    return updated;
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

    const updated = await this.ordersRepository.save(order);

    if (paymentStatus !== PaymentStatus.PENDING) {
      if (updated.userId) {
        const text =
          paymentStatus === PaymentStatus.PAID
            ? `✅ Оплату замовлення №${updated.id} підтверджено. Дякуємо!`
            : `⚠️ Оплата замовлення №${updated.id} не пройшла. Зв'яжіться з підтримкою.`;
        this.telegramService.notifyUser(updated.userId, text).catch(() => {});
      }

      this.recipientOf(updated)
        .then((recipient) => {
          if (!recipient) return;
          return paymentStatus === PaymentStatus.PAID
            ? this.mailService.sendPaymentConfirmed(recipient.email, updated.id)
            : this.mailService.sendPaymentFailed(recipient.email, updated.id);
        })
        .catch(() => {});
    }

    return updated;
  }

  async updateStatusAdmin(
    id: number,
    status: OrderStatus,
    trackingNumber?: string,
  ): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === status) {
      return order;
    }

    // The shipped mail is built around the waybill, so refuse the transition
    // without one rather than send the customer a notice they can't act on.
    if (status === OrderStatus.SHIPPED) {
      const ttn = trackingNumber?.trim();
      if (!ttn) {
        throw new BadRequestException(
          'Вкажіть номер накладної (ТТН), щоб позначити замовлення відправленим',
        );
      }
      order.trackingNumber = ttn;
    }

    const wasCancelled = order.status === OrderStatus.CANCELLED;
    const willBeCancelled = status === OrderStatus.CANCELLED;

    if (!wasCancelled && willBeCancelled) {
      const updated = await this.dataSource.transaction(async (manager) => {
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

      this.notifyUserOfStatusChange(updated).catch(() => {});
      this.emailStatusChange(updated).catch(() => {});
      return updated;
    }

    if (wasCancelled && !willBeCancelled) {
      const updated = await this.dataSource.transaction(async (manager) => {
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

      this.notifyUserOfStatusChange(updated).catch(() => {});
      this.emailStatusChange(updated).catch(() => {});
      return updated;
    }

    order.status = status;

    const updated = await this.ordersRepository.save(order);
    this.notifyUserOfStatusChange(updated).catch(() => {});
    this.emailStatusChange(updated).catch(() => {});
    return updated;
  }

  // Only two status changes are worth an email. CONFIRMED usually lands
  // minutes after the receipt, and COMPLETED tells the customer something
  // they already know — the painting is in their hands.
  private async emailStatusChange(order: Order) {
    if (
      order.status !== OrderStatus.SHIPPED &&
      order.status !== OrderStatus.CANCELLED
    ) {
      return;
    }

    const recipient = await this.recipientOf(order);
    if (!recipient) return;

    if (order.status === OrderStatus.CANCELLED) {
      await this.mailService.sendOrderCancelled(recipient.email, order.id);
      return;
    }

    if (order.trackingNumber) {
      await this.mailService.sendOrderShipped(
        recipient.email,
        order.id,
        order.trackingNumber,
        this.deliveryPlaceOf(order),
      );
    }
  }

  private async notifyUserOfStatusChange(order: Order) {
    if (!order.userId) return;

    await this.telegramService.notifyUser(
      order.userId,
      `📦 Замовлення №${order.id} ${ORDER_STATUS_MESSAGE[order.status]}`,
    );
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

  // "Delete from view" for completed orders — hides it from the admin's
  // default list without touching the record. It still shows up under the
  // Completed tab, which ignores this flag entirely.
  async archiveAdmin(id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Тільки виконані замовлення можна прибрати з перегляду');
    }

    order.isArchived = true;

    return this.ordersRepository.save(order);
  }
}
