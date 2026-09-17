import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// A single outstanding "set a new password" link.
//
// The token is 32 random bytes and never stored in the clear — the same
// reasoning as the refresh session next door, and more pointed here: a reset
// token is a full account takeover for as long as it lives, so a leaked backup
// must not hand one over.
//
// `usedAt` rather than deleting the row on use: a reset that has already been
// spent and one that never existed have to be told apart in the log, and a
// second click on the same link in an email client's prefetcher must not read
// as a fresh, valid attempt.
@Entity('password_resets')
@Index('idx_password_resets_user', ['userId'])
export class PasswordReset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'datetime', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
