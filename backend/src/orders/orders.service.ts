import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { readFile, unlink } from 'fs/promises';

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
import { CreateCommissionDto } from './dto/create-commission.dto';
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
  [PaymentProvider.ON_AGREEMENT]: 'За домовленістю',
};

const ORDER_STATUS_MESSAGE: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'очікує на обробку',
  [OrderStatus.CONFIRMED]: 'підтверджено. Ми готуємо його до відправки',
  [OrderStatus.SHIPPED]: 'відправлено! Перевірте статус посилки в застосунку Нової пошти',
  [OrderStatus.CANCELLED]: 'скасовано',
  [OrderStatus.COMPLETED]: 'виконано. Дякуємо за покупку!',
};

// Money is added up in integer cents, never floats. Prices come out of MySQL
// as DECIMAL strings, and 0.1 + 0.2 is as untrue here as anywhere else.
function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

// Every place that locks painting rows walks them in the same order, by id.
// Without that, two transactions holding the same two paintings in opposite
// orders take the locks crosswise and deadlock.
function stockOrder<T extends { paintingId: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.paintingId - right.paintingId);
}

// Shared by both CartItem and Order lookups — both entities key guest rows
// by the same guestToken column, so one where-clause builder covers both.
function identityWhere(identity: Identity) {
  return 'userId' in identity
    ? { userId: identity.userId }
    : { guestToken: identity.guestToken };
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

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
      (!dto.novaPoshtaCityRef?.trim() || !dto.novaPoshtaWarehouseRef?.trim())
    ) {
      throw new BadRequestException('Оберіть місто та відділення Нової пошти');
    }

    // The address is resolved from the refs, not accepted from the client:
    // the delivery fee is priced from novaPoshtaCityRef, so letting the
    // written-down city be an unrelated free string meant paying for one
    // destination and being sent to another. Resolving the warehouse through
    // its city also rejects a warehouse ref that belongs somewhere else.
    let deliveryAddress: { city: string; warehouse: string } | null = null;

    if (dto.deliveryMethod === DeliveryMethod.NOVA_POSHTA) {
      const [city, warehouse] = await Promise.all([
        this.novaPoshtaService.getCityByRef(dto.novaPoshtaCityRef!),
        this.novaPoshtaService.getWarehouseByRef(
          dto.novaPoshtaCityRef!,
          dto.novaPoshtaWarehouseRef!,
        ),
      ]);

      if (!city || !warehouse) {
        throw new BadRequestException(
          'Не вдалося підтвердити відділення Нової пошти — оберіть місто й відділення ще раз',
        );
      }

      deliveryAddress = { city: city.name, warehouse: warehouse.name };
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
      // Accumulated in integer cents. price is DECIMAL(10,2) and arrives as a
      // string; summing it as a float is how a two-item order ends up a
      // hundredth of a hryvnia off the number the gateway settles, which is
      // the reason the callback reconciliation needed a tolerance at all.
      let totalCents = 0;

      // Two checkouts for the last copy of a painting both used to pass the
      // stock check: under REPEATABLE READ a plain SELECT takes no lock, so
      // both transactions read amount = 1, both decided it was enough, and both
      // decremented. The transaction only ever guaranteed that the writes were
      // atomic — not that what was read still held when they landed. The
      // oversell wasn't even visible afterwards, since amount is clamped at 0.
      //
      // Locking each row for update serialises that: the second checkout waits
      // for the first to commit, then reads amount = 0 and fails properly.
      for (const cartItem of stockOrder(cartItems)) {
        const painting = await manager.findOne(Painting, {
          where: { id: cartItem.paintingId },
          lock: { mode: 'pessimistic_write' },
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

        totalCents += toCents(painting.price) * cartItem.quantity;

        painting.amount -= cartItem.quantity;
        if (painting.amount <= 0) {
          painting.amount = 0;
          painting.isAvailable = false;
        }

        await manager.save(painting);
      }

      totalCents += toCents(deliveryCost) + toCents(codFee);

      const total = totalCents / 100;

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
        novaPoshtaCity: deliveryAddress?.city ?? null,
        novaPoshtaWarehouse: deliveryAddress?.warehouse ?? null,
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

    // A commission needs telling apart at a glance: nothing has been taken
    // out of stock, no money is due yet, and the first move is the artist's —
    // reading it as an ordinary sale would be the wrong response entirely.
    const lines = [
      order.isCommission
        ? `🎨 Замовлення ПОВТОРУ роботи №${order.id}`
        : `🛒 Нове замовлення №${order.id}`,
      order.isCommission
        ? 'Робота ще не написана — узгодьте ціну й терміни з клієнтом.'
        : null,
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
      order.isCommission
        ? `Орієнтовно: ${Number(order.total).toLocaleString('uk-UA')} ₴ (ціна оригіналу)`
        : `Сума: ${Number(order.total).toLocaleString('uk-UA')} ₴`,
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

    // Once it's with the courier the painting is physically gone, but the
    // cancel below puts its quantity back on the shelf and flips isAvailable —
    // so a customer could cancel a parcel already in transit and the same
    // one-of-a-kind work would go back up for sale. Anything past dispatch is
    // a conversation with support, not a button.
    if (order.status === OrderStatus.SHIPPED) {
      throw new BadRequestException(
        'Замовлення вже відправлено — щоб його скасувати, звʼяжіться з підтримкою',
      );
    }

    const updated = await this.dataSource.transaction(async (manager) => {
      // Restoring stock is the same read-modify-write as taking it, so it
      // needs the same lock: two orders cancelled at once, both holding the
      // same painting, would otherwise read the same amount and one of the two
      // increments would be lost. Locked in id order, as in checkout().
      for (const item of stockOrder(order.items)) {
        const painting = await manager.findOne(Painting, {
          where: { id: item.paintingId },
          lock: { mode: 'pessimistic_write' },
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

  // The uploaded file is already on disk when this runs: the route is open to
  // guests, and multer's interceptor writes before the handler gets a say. So
  // every path out of here — including the rejections below — has to take the
  // temp file with it, or an anonymous caller can fill the volume one 404 at a
  // time. uploadImage() cleans up after itself; these early exits didn't.
  async uploadPaymentProof(
    identity: Identity,
    id: number,
    file: Express.Multer.File,
  ): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, ...identityWhere(identity) },
    });

    if (!order) {
      await this.discardTempFile(file);
      throw new NotFoundException('Order not found');
    }

    if (order.paymentProvider !== PaymentProvider.CARD_TRANSFER) {
      await this.discardTempFile(file);
      throw new BadRequestException(
        'Скріншот оплати можна додати лише для переказу на карту',
      );
    }

    // Read the temp file into memory before uploadImage deletes it — the
    // Telegram send below needs the raw bytes, not just the Cloudinary URL.
    let proofBuffer: Buffer;

    try {
      proofBuffer = await readFile(file.path);
    } catch (error) {
      await this.discardTempFile(file);
      throw error;
    }

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

  // Best-effort: failing to remove a temp file must not replace the real error
  // (a 404, a bad payment method) with a filesystem one.
  private async discardTempFile(file: Express.Multer.File): Promise<void> {
    try {
      await unlink(file.path);
    } catch (error) {
      this.logger.warn(`Failed to remove temp upload ${file.path}`, error);
    }
  }

  // A request to paint a sold-out work again.
  //
  // Everything checkout does about stock is deliberately absent: there is no
  // cart to empty, nothing to reserve, and nothing to decrement — the painting
  // being ordered doesn't exist yet. What's stored is a conversation waiting to
  // happen, with a customer, an address and a price to start from.
  async createCommission(
    identity: Identity,
    dto: CreateCommissionDto,
  ): Promise<Order> {
    const painting = await this.dataSource
      .getRepository(Painting)
      .findOne({ where: { id: dto.paintingId } });

    if (!painting) {
      throw new NotFoundException('Painting not found');
    }

    // Checked server-side rather than trusted from the page that offered the
    // button: the flag is what makes the offer real.
    if (!painting.isRepeatable) {
      throw new BadRequestException('Ця робота не доступна для повтору');
    }

    const isGuest = !('userId' in identity);

    let deliveryAddress: { city: string; warehouse: string } | null = null;

    // Optional here, unlike checkout. Someone commissioning a painting often
    // doesn't know yet where it should go — that gets settled along with the
    // price and the timing.
    if (dto.novaPoshtaCityRef?.trim() && dto.novaPoshtaWarehouseRef?.trim()) {
      const [city, warehouse] = await Promise.all([
        this.novaPoshtaService.getCityByRef(dto.novaPoshtaCityRef),
        this.novaPoshtaService.getWarehouseByRef(
          dto.novaPoshtaCityRef,
          dto.novaPoshtaWarehouseRef,
        ),
      ]);

      if (city && warehouse) {
        deliveryAddress = { city: city.name, warehouse: warehouse.name };
      }
    }

    const order = this.ordersRepository.create({
      userId: isGuest ? null : (identity as { userId: number }).userId,
      guestToken: isGuest ? (identity as { guestToken: string }).guestToken : null,
      // Stored for every commission, account or not: these are the details
      // the customer gave for this particular conversation.
      guestName: dto.name.trim(),
      guestEmail: dto.email.trim(),
      guestPhone: dto.phone.trim(),
      guestAddress: null,
      comment: dto.comment?.trim() || null,
      status: OrderStatus.PENDING,
      isCommission: true,
      paymentProvider: PaymentProvider.ON_AGREEMENT,
      deliveryMethod: DeliveryMethod.NOVA_POSHTA,
      novaPoshtaCity: deliveryAddress?.city ?? null,
      novaPoshtaWarehouse: deliveryAddress?.warehouse ?? null,
      deliveryCost: 0,
      codFee: 0,
      // The listed price of the original, as a starting point. A repeat is
      // quoted properly once the artist and the customer have talked.
      total: Number(painting.price),
      items: [
        this.ordersRepository.manager.create(OrderItem, {
          paintingId: painting.id,
          quantity: 1,
          price: painting.price,
        }),
      ],
    });

    const saved = await this.ordersRepository.save(order);

    this.notifyAdminOfNewOrder(saved.id).catch(() => {});
    this.emailCommissionPlaced(saved.id, painting.title).catch(() => {});

    return saved;
  }

  private async emailCommissionPlaced(orderId: number, title: string) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) return;

    const recipient = await this.recipientOf(order);
    if (!recipient) return;

    await this.mailService.sendCommissionPlaced(recipient.email, {
      id: order.id,
      customerName: recipient.name,
      paintingTitle: title,
      referencePrice: Number(order.total),
      deliveryPlace: this.deliveryPlaceOf(order),
      comment: order.comment,
    });
  }

  // Signing in takes the guest's orders with it, the same way the cart and the
  // support thread already did. Without this the history simply vanished:
  // findAllForIdentity looks orders up by userId once there's an account, and
  // the guest rows stay keyed to a token the client stops sending.
  //
  // guestName/Email/Phone are left on the row on purpose — they are what the
  // customer actually typed for that delivery, and the account's current
  // details are not a substitute for the record of what was ordered then.
  async claimGuestOrders(
    userId: number,
    guestToken: string,
  ): Promise<{ claimed: number }> {
    const result = await this.ordersRepository.update(
      { guestToken, userId: IsNull() },
      { userId, guestToken: null },
    );

    return { claimed: result.affected ?? 0 };
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
        for (const item of stockOrder(order.items)) {
          const painting = await manager.findOne(Painting, {
            where: { id: item.paintingId },
            lock: { mode: 'pessimistic_write' },
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

        // Un-cancelling takes the stock back, so it races exactly as checkout
        // does — an admin restoring an order while a customer buys the last
        // copy. The two-pass shape (check everything, then decrement) is what
        // keeps a partial failure from leaving stock half-taken; the lock is
        // what makes the checks still true by the time the writes happen.
        for (const item of stockOrder(order.items)) {
          const painting = await manager.findOne(Painting, {
            where: { id: item.paintingId },
            lock: { mode: 'pessimistic_write' },
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

  // CONFIRMED is the one status change that stays silent — it usually lands
  // minutes after the receipt and repeats it. The rest each carry something
  // the customer can't get anywhere else: a waybill, a refund promise, or,
  // once the work is home, how to keep it that way.
  private async emailStatusChange(order: Order) {
    if (
      order.status !== OrderStatus.SHIPPED &&
      order.status !== OrderStatus.COMPLETED &&
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

    if (order.status === OrderStatus.COMPLETED) {
      await this.mailService.sendOrderCompleted(
        recipient.email,
        this.toMailData(order, recipient.name),
      );
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

  // The admin's "send it anyway" button. Automatic sends are deduplicated per
  // status, so a corrected waybill or a status flipped back and forth needs a
  // deliberate way to reach the customer again — this is it.
  async sendStatusMailAdmin(id: number): Promise<{ message: string }> {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const recipient = await this.recipientOf(order);
    if (!recipient) {
      throw new BadRequestException(
        'У цього замовлення немає email, куди надіслати лист',
      );
    }

    const mailData = this.toMailData(order, recipient.name);

    switch (order.status) {
      case OrderStatus.PENDING: {
        const iban =
          order.paymentProvider === PaymentProvider.CARD_TRANSFER
            ? (await this.settingsService.get()).cardTransferIban || null
            : null;

        await this.mailService.sendOrderPlaced(recipient.email, mailData, iban, {
          force: true,
        });
        break;
      }

      case OrderStatus.SHIPPED: {
        if (!order.trackingNumber) {
          throw new BadRequestException(
            'Немає номера накладної — лист про відправку без нього безкорисний',
          );
        }

        await this.mailService.sendOrderShipped(
          recipient.email,
          order.id,
          order.trackingNumber,
          this.deliveryPlaceOf(order),
          { force: true },
        );
        break;
      }

      case OrderStatus.COMPLETED:
        await this.mailService.sendOrderCompleted(recipient.email, mailData, {
          force: true,
        });
        break;

      case OrderStatus.CANCELLED:
        await this.mailService.sendOrderCancelled(recipient.email, order.id, {
          force: true,
        });
        break;

      // CONFIRMED has no letter of its own: it lands minutes after the receipt
      // and would only repeat it.
      default:
        throw new BadRequestException(
          'Для цього статусу листа не передбачено',
        );
    }

    return { message: `Лист надіслано на ${recipient.email}` };
  }

  async sendApologyMailAdmin(id: number): Promise<{ message: string }> {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const recipient = await this.recipientOf(order);
    if (!recipient) {
      throw new BadRequestException(
        'У цього замовлення немає email, куди надіслати лист',
      );
    }

    await this.mailService.sendOrderApology(recipient.email, order.id);

    return { message: `Лист-вибачення надіслано на ${recipient.email}` };
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
