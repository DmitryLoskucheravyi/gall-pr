import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Giveaway } from './giveaway.entity';

@Entity('giveaway_participants')
@Unique(['giveawayId', 'userId'])
export class GiveawayParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'giveaway_id' })
  giveawayId: number;

  @ManyToOne(() => Giveaway, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'giveaway_id' })
  giveaway: Giveaway;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
