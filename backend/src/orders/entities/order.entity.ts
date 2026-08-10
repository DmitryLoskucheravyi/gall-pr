import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum PaymentProvider {
  LIQPAY = 'LIQPAY',
  WAYFORPAY = 'WAYFORPAY',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  CARD_TRANSFER = 'CARD_TRANSFER',
  // Commissioned repeats only. The work doesn't exist yet, so its price and
  // timing are settled between the artist and the customer before any money
  // moves — there's nothing to charge at the moment the order is placed, and
  // saying "card transfer" would be a promise nobody made.
  ON_AGREEMENT = 'ON_AGREEMENT',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export enum DeliveryMethod {
  NOVA_POSHTA = 'NOVA_POSHTA',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'guest_token', type: 'varchar', length: 64, nullable: true })
  guestToken: string | null;

  @Column({ name: 'guest_name', type: 'varchar', nullable: true })
  guestName: string | null;

  @Column({ name: 'guest_email', type: 'varchar', nullable: true })
  guestEmail: string | null;

  @Column({ name: 'guest_phone', type: 'varchar', nullable: true })
  guestPhone: string | null;

  @Column({ name: 'guest_address', type: 'varchar', length: 500, nullable: true })
  guestAddress: string | null;

  // Telegram or Instagram, whichever the customer would rather be reached on.
  // One field rather than two: nobody wants to be asked for both, and which
  // one it is is obvious from what they typed.
  //
  // Its own column rather than folded into the comment, because it's a way to
  // reach someone — the admin acts on it, and it shouldn't have to be found by
  // reading prose.
  @Column({ name: 'contact_handle', type: 'varchar', length: 120, nullable: true })
  contactHandle: string | null;

  // Nova Poshta waybill, set by the admin at the moment the order is marked
  // SHIPPED — the shipped email is worthless without it.
  @Column({ name: 'tracking_number', type: 'varchar', length: 64, nullable: true })
  trackingNumber: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'delivery_method', type: 'enum', enum: DeliveryMethod })
  deliveryMethod: DeliveryMethod;

  @Column({ name: 'call_me_requested', type: 'boolean', default: false })
  callMeRequested: boolean;

  @Column({ name: 'nova_poshta_city', type: 'varchar', nullable: true })
  novaPoshtaCity: string | null;

  @Column({ name: 'nova_poshta_warehouse', type: 'varchar', nullable: true })
  novaPoshtaWarehouse: string | null;

  @Column('decimal', { name: 'delivery_cost', precision: 10, scale: 2, default: 0 })
  deliveryCost: number;

  @Column('decimal', { name: 'cod_fee', precision: 10, scale: 2, default: 0 })
  codFee: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ name: 'payment_provider', type: 'enum', enum: PaymentProvider })
  paymentProvider: PaymentProvider;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ name: 'payment_transaction_id', type: 'varchar', nullable: true })
  paymentTransactionId: string | null;

  // Screenshot the buyer attaches as proof of a manual card transfer. Set via
  // POST /orders/:id/payment-proof; forwarded to the admin's Telegram on upload.
  @Column({ name: 'payment_proof_url', type: 'varchar', nullable: true })
  paymentProofUrl: string | null;

  // A request to paint a sold-out work again, rather than a purchase of one
  // that exists. It shares this table because it is an order in every way the
  // admin cares about — a customer, an address, a status, a thread of emails —
  // but it never touched the cart, took nothing out of stock, and its price is
  // a starting point rather than a total.
  @Column({ name: 'is_commission', default: false })
  isCommission: boolean;

  // Soft-hide for the admin's default order list. Only settable once an
  // order reaches COMPLETED — the order itself is never deleted, it just
  // stops cluttering the active view and only shows under the Completed tab.
  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @OneToMany(() => OrderItem, (item) => item.order, {
    eager: true,
    cascade: true,
  })
  items: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
