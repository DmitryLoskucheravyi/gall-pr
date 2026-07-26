import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Painting } from '../../paintings/entities/painting.entity';

@Entity('cart_items')
@Unique(['userId', 'paintingId'])
@Unique(['guestToken', 'paintingId'])
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'guest_token', type: 'varchar', length: 64, nullable: true })
  guestToken: string | null;

  @Column({ name: 'painting_id' })
  paintingId: number;

  @ManyToOne(() => Painting, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'painting_id' })
  painting: Painting;

  @Column({ default: 1 })
  quantity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
