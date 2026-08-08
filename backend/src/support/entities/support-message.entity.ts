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

  // Null when a guest wrote it — there is no account behind the message.
  // senderRole still says which side of the conversation it came from, which
  // is all the thread needs to render it.
  @Column({ name: 'sender_id', type: 'int', nullable: true })
  senderId: number | null;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender: User | null;

  @Column({ name: 'sender_role', type: 'varchar', length: 10 })
  senderRole: UserRole;

  @Column('text')
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
