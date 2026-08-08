import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

// A chat belongs to exactly one of these: an account, or an anonymous browser
// identified by the same guest token that already carries its cart and its
// guest orders. Reusing that token rather than minting a support-only one is
// what lets a guest close the tab, come back, and still find their thread —
// and what makes the person who chatted and the person who ordered the same
// person to us.
@Entity('support_chats')
export class SupportChat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'guest_token', type: 'varchar', length: 64, nullable: true })
  guestToken: string | null;

  @Column({ name: 'last_message_at', type: 'datetime', nullable: true })
  lastMessageAt: Date | null;

  @Column({ name: 'unread_by_admin', default: 0 })
  unreadByAdmin: number;

  @Column({ name: 'unread_by_user', default: 0 })
  unreadByUser: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
