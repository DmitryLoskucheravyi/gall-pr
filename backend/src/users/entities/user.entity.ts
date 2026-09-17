import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';

import { PaintingLike } from '../../likes/entities/painting-like.entity';

// `refresh_token` used to live here as a single column, which made being
// signed in a property of the account rather than of a device: a second login
// overwrote the first and silently ended it. Sessions are rows now — see
// auth/entities/refresh-session.entity.ts — and the old column is dropped by
// temp/2026-09-fixes.sql.

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  // Unique in the database. Stored lower-cased (AuthService normalises on the
  // way in) so two accounts can't differ only by the case of the address.
  @Column({ type: 'varchar', length: 255, unique: true })
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

  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone: string;

  // The column is spelled `addres` in the database, and renaming it is a
  // migration for a field nothing reads — so the typo is quarantined here, at
  // the mapping, rather than repeated through the code. See
  // temp/2026-09-fixes.sql if it is ever worth renaming for real.
  @Column({ name: 'addres', type: 'varchar', length: 255, nullable: true })
  address: string | null;

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
