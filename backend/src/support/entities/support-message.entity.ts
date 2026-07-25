import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

import { User, UserRole } from '../../users/entities/user.entity';
import { SupportChat } from './support-chat.entity';

@Entity('support_messages')
export class SupportMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chat_id' })
  chatId: number;

  @ManyToOne(() => SupportChat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: SupportChat;

  @Column({ name: 'sender_id' })
  senderId: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'sender_role', type: 'varchar', length: 10 })
  senderRole: UserRole;

  @Column('text')
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
