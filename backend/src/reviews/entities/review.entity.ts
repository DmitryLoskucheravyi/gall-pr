import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Order } from '../../orders/entities/order.entity';

// A customer's word on an order that reached them. See
// backend/temp/2026-10-reviews.sql for the rules the table itself holds.
@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @OneToOne(() => Order, (order) => order.review, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: number | null;

  @Column({ name: 'author_name', length: 100 })
  authorName: string;

  @Column({ type: 'tinyint' })
  rating: number;

  @Column('text')
  text: string;

  // Off until the admin publishes it.
  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
