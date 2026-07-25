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
import { Painting } from '../../paintings/entities/painting.entity';

@Entity('likes')
@Unique(['userId', 'paintingId'])
export class PaintingLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'painting_id' })
  paintingId: number;

  @ManyToOne(() => Painting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'painting_id' })
  painting: Painting;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
