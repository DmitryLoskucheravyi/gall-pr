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

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  // Email verification (6-digit code). Code is stored hashed, never in plain text.
  @Column({ name: 'verification_code_hash', type: 'varchar', nullable: true })
  verificationCodeHash: string | null;

  @Column({ name: 'verification_expires_at', type: 'datetime', nullable: true })
  verificationExpiresAt: Date | null;

  @Column({ name: 'verification_sent_at', type: 'datetime', nullable: true })
  verificationSentAt: Date | null;

  @Column({ name: 'verification_attempts', default: 0 })
  verificationAttempts: number;

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

  @OneToMany(() => PaintingLike, (like) => like.user)
  likes: PaintingLike[];
}
