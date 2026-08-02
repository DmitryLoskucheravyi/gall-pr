import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

// Bot -> site direction of account linking: /start with no payload (user
// opened the bot directly, not via the profile-page deep link) generates one
// of these, keyed by the chat that asked. The site then redeems the code
// against whichever user is currently logged in.
@Entity('telegram_pending_links')
export class TelegramPendingLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ name: 'chat_id' })
  chatId: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
