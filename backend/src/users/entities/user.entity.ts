import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';

import { PaintingLike } from '../../likes/entities/painting-like.entity';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'phone' })
  phone: string;

  @Column({ name: 'addres', nullable: true })
  addres: string;

  @Column({ name: 'refresh_token', nullable: true, type: 'text' })
  refreshToken: string | null;

  // Telegram bot linkage. Stored as varchar (not bigint) — sidesteps any
  // precision edge cases with Telegram's chat ids and keeps TypeORM/MySQL
  // interop simple. linkCode is a short-lived one-time code shown as a
  // t.me deep link on the profile page; the bot's /start handler resolves it.
  @Column({ name: 'telegram_chat_id', type: 'varchar', nullable: true })
  telegramChatId: string | null;

  @Column({ name: 'telegram_link_code', type: 'varchar', nullable: true })
  telegramLinkCode: string | null;

  @Column({
    name: 'telegram_link_code_expires_at',
    type: 'datetime',
    nullable: true,
  })
  telegramLinkCodeExpiresAt: Date | null;

  @OneToMany(() => PaintingLike, (like) => like.user)
  likes: PaintingLike[];
}
