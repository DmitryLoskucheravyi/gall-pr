import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// One row per signed-in device.
//
// The refresh token used to live in a single column on `users`, which made
// "logged in" a property of the account rather than of a browser: signing in
// on a phone overwrote the desktop's token and silently ended that session, and
// there was no way to see where you were signed in or to end one session
// without ending them all. A row per session is what makes any of that
// possible.
//
// Only the SHA-256 of the token is stored, for the reason set out in
// auth.service.ts: a database dump should not be a set of working 30-day
// logins. The hash is unique because it is how a presented token is looked up
// — two sessions could never legitimately share one.
@Entity('refresh_sessions')
@Index('idx_refresh_sessions_user', ['userId'])
export class RefreshSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash: string;

  // Rotation writes a new row and deletes the old one, so this is also the
  // moment the session was last used.
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Mirrors the JWT's own expiry. Kept as a column as well so expired rows can
  // be swept without verifying every token, and so the table doesn't grow for
  // the life of the shop.
  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  // Enough to tell "my laptop" from "my phone" in a session list. Truncated on
  // write — a User-Agent is client-supplied text and has no business being
  // unbounded.
  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;
}
