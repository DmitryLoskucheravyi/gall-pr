import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { RefreshSession } from './entities/refresh-session.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { JwtPayload } from './types/jwt-payload.type';
import { jwtRefreshSecret } from '../config/secrets';

const REFRESH_TTL_DAYS = 30;
const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const BCRYPT_ROUNDS = 10;

// Refresh tokens are hashed before they're written down, so a database dump is
// no longer a set of working 30-day logins.
//
// SHA-256 rather than bcrypt, deliberately: a refresh token is a signed JWT
// with full entropy, not a human-chosen password, so there is nothing for a
// slow hash to protect against. bcrypt would also be actively wrong here — it
// truncates its input at 72 bytes, and two tokens issued to the same user share
// a far longer prefix than that, so rotation would silently stop working and an
// old token would keep validating against the new hash.
function sha256(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

// MySQL's duplicate-key error, whatever driver dressing it arrives in. Used to
// turn a lost race on the users.email unique index into the 400 it always
// should have been rather than an unhandled 500.
function isDuplicateKey(error: unknown): boolean {
  const code = (error as { driverError?: { code?: string }; code?: string })
    ?.driverError?.code;

  return (
    code === 'ER_DUP_ENTRY' ||
    (error as { code?: string })?.code === 'ER_DUP_ENTRY'
  );
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    @InjectRepository(RefreshSession)
    private readonly sessionsRepository: Repository<RefreshSession>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetsRepository: Repository<PasswordReset>,
  ) {}

  private buildUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      telegramLinked: !!user.telegramChatId,
    };
  }

  // A disabled account is disabled everywhere, so this is checked on the way
  // in and again on every authenticated request (see JwtStrategy). The column
  // existed and was shown in the admin list for a long time while nothing
  // anywhere read it — a switch that did nothing.
  private assertActive(user: User): void {
    if (user.isActive === false) {
      throw new ForbiddenException(
        'Доступ до акаунта призупинено. Звʼяжіться з підтримкою.',
      );
    }
  }

  async register(registerDto: RegisterDto, userAgent?: string) {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new BadRequestException('Користувач з таким email вже існує');
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      BCRYPT_ROUNDS,
    );

    let user: User;

    try {
      user = await this.usersService.create({
        email,
        passwordHash: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
      });
    } catch (error) {
      // The check above is check-then-insert, so two registrations for the
      // same address submitted together both saw nothing and both inserted.
      // users.email is unique, so the loser used to surface as a 500.
      if (isDuplicateKey(error)) {
        throw new BadRequestException('Користувач з таким email вже існує');
      }

      throw error;
    }

    const tokens = await this.issueSession(user, userAgent);

    return { ...tokens, user: this.buildUserResponse(user) };
  }

  async login(loginDto: LoginDto, userAgent?: string) {
    const user = await this.usersService.findByEmail(
      loginDto.email.trim().toLowerCase(),
    );

    if (!user) {
      // Compared against a throwaway hash so a missing account and a wrong
      // password take the same time — otherwise the difference between them is
      // readable from the response time, which is an account-enumeration
      // oracle on a shop where the email is the login.
      await bcrypt.compare(loginDto.password, DUMMY_HASH);
      throw new BadRequestException('Невірний email або пароль');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Невірний email або пароль');
    }

    this.assertActive(user);

    const tokens = await this.issueSession(user, userAgent);

    return { ...tokens, user: this.buildUserResponse(user) };
  }

  private signTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: `${REFRESH_TTL_DAYS}d`,
      // A different key from the access token on purpose. They carry an
      // identical payload, so with one shared key a 15-minute access token
      // would be byte-for-byte acceptable as a 30-day refresh token.
      secret: jwtRefreshSecret(),
      // Distinct per issue, so two sessions opened in the same second on the
      // same account can never hash to the same row. Without it the payload is
      // a pure function of the user and the second's `iat`.
      jwtid: randomBytes(16).toString('hex'),
    });

    return { accessToken, refreshToken };
  }

  // Signs a pair and records the device. Every way into a session goes through
  // here, so there is one place that knows a session is a row.
  private async issueSession(user: User, userAgent?: string) {
    const tokens = this.signTokens(user);

    await this.sessionsRepository.save(
      this.sessionsRepository.create({
        userId: user.id,
        tokenHash: sha256(tokens.refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        userAgent: userAgent?.slice(0, 255) ?? null,
      }),
    );

    // Cheap opportunistic housekeeping: a shop this size will never need a
    // cron for it, and an unswept table grows a row per sign-in forever.
    void this.sessionsRepository
      .delete({ userId: user.id, expiresAt: LessThan(new Date()) })
      .catch(() => {});

    return tokens;
  }

  // Every failure here is the same 401: a caller holding a refresh token that
  // isn't good any more needs to log in, and which of the checks tripped is
  // none of their business.
  //
  // Returns the user alongside the tokens because this is also what the web
  // app calls on startup: nothing about the session is persisted client-side,
  // so a page load has to ask who it is. Handing the profile back here makes
  // that one round trip instead of a refresh followed by /auth/me.
  // No userAgent parameter: rotation updates the token on an existing row and
  // deliberately leaves the device description alone. The row records where
  // the session was opened, which is what makes the list in the profile
  // meaningful — overwriting it on every refresh would let a stolen cookie
  // quietly redescribe itself as the owner's laptop.
  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: jwtRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = sha256(refreshToken);
    const session = await this.sessionsRepository.findOne({
      where: { tokenHash },
    });

    if (!session) {
      // The signature is ours and the token hasn't expired, yet no session
      // holds it — which means it was already rotated away. Either someone is
      // replaying a token they shouldn't have, or a stolen one has already
      // been used. Both are answered the same way: end every session on the
      // account, so whichever of the two parties is the real owner has to sign
      // in again and the other is simply out.
      this.logger.warn(
        `Refresh token reuse detected for user ${payload.sub} — revoking every session`,
      );
      await this.sessionsRepository.delete({ userId: payload.sub });

      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessionsRepository.delete({ id: session.id });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(session.userId);

    if (!user) {
      await this.sessionsRepository.delete({ id: session.id });
      throw new UnauthorizedException('Invalid refresh token');
    }

    // A deactivated account loses its sessions rather than quietly keeping a
    // valid 30-day token that only fails at the next login attempt.
    if (user.isActive === false) {
      await this.sessionsRepository.delete({ userId: user.id });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = this.signTokens(user);

    // Rotation: the row is updated in place rather than deleted and reinserted,
    // so the session keeps its identity (and its user-agent) across refreshes
    // and a concurrent refresh can't leave the account with two live rows.
    await this.sessionsRepository.update(
      { id: session.id, tokenHash },
      {
        tokenHash: sha256(tokens.refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    );

    return { ...tokens, user: this.buildUserResponse(user) };
  }

  // Best-effort by design: the caller clears the cookie no matter what this
  // does, so a session that can't be identified — expired token, already
  // logged out, no cookie at all — still ends on the client. What must not
  // happen is logout failing and leaving a live refresh token behind.
  //
  // Only this device's session is ended. Signing out of a shared computer
  // should not sign you out of your phone.
  async logoutByRefreshToken(refreshToken: string | undefined) {
    if (refreshToken) {
      await this.sessionsRepository.delete({ tokenHash: sha256(refreshToken) });
    }

    return { message: 'Logged out' };
  }

  // The "sign out everywhere" button, and the thing a password change does on
  // the caller's behalf.
  async logoutEverywhere(userId: number) {
    const result = await this.sessionsRepository.delete({ userId });

    return { ended: result.affected ?? 0 };
  }

  async listSessions(userId: number, currentRefreshToken?: string) {
    const sessions = await this.sessionsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const currentHash = currentRefreshToken
      ? sha256(currentRefreshToken)
      : null;

    return sessions
      .filter((session) => session.expiresAt.getTime() > Date.now())
      .map((session) => ({
        id: session.id,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        // Never the hash itself — only whether this is the device asking.
        isCurrent: !!currentHash && hashesMatch(session.tokenHash, currentHash),
      }));
  }

  async endSession(userId: number, sessionId: number) {
    // Scoped by userId so an id from somewhere else ends nothing.
    const result = await this.sessionsRepository.delete({
      id: sessionId,
      userId,
    });

    if (!result.affected) {
      throw new BadRequestException('Сесію не знайдено');
    }

    return { message: 'Session ended' };
  }

  // ---------------------------------------------------------------- password

  // Always the same answer, whether or not the address belongs to anyone.
  // Telling an anonymous caller "no such user" turns this route into a way to
  // test which of a list of addresses shops here.
  async requestPasswordReset(rawEmail: string): Promise<{ message: string }> {
    const acknowledgement = {
      message: 'Якщо такий акаунт існує, лист із посиланням уже в дорозі.',
    };

    const email = rawEmail.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (!user || user.isActive === false) {
      return acknowledgement;
    }

    // One live link at a time: asking again should replace the last one, not
    // leave a trail of working keys behind.
    await this.passwordResetsRepository.delete({ userId: user.id });

    const token = randomBytes(32).toString('hex');

    await this.passwordResetsRepository.save(
      this.passwordResetsRepository.create({
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        usedAt: null,
      }),
    );

    const base = (process.env.WEB_URL ?? '').replace(/\/$/, '');
    const link = `${base}/ua/reset-password?token=${token}`;

    await this.mailService.sendPasswordReset(
      user.email,
      user.firstName ?? null,
      link,
      Math.round(PASSWORD_RESET_TTL_MS / 60_000),
    );

    return acknowledgement;
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.passwordResetsRepository.findOne({
      where: { tokenHash: sha256(token) },
    });

    if (!reset || reset.usedAt || reset.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Посилання недійсне або застаріло. Спробуйте надіслати запит ще раз.',
      );
    }

    const user = await this.usersService.findById(reset.userId);

    if (!user) {
      throw new BadRequestException('Посилання недійсне або застаріло.');
    }

    await this.usersService.update(user.id, {
      passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
    });

    await this.passwordResetsRepository.update(
      { id: reset.id },
      { usedAt: new Date() },
    );

    // Whoever set this password now owns the account, and anyone who was
    // already signed in on it may be exactly the reason the reset happened.
    await this.sessionsRepository.delete({ userId: user.id });

    return { message: 'Пароль змінено. Тепер увійдіть із новим паролем.' };
  }

  // The signed-in version. Requires the current password, because an unlocked
  // laptop should not be enough to take an account away from its owner.
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
    keepRefreshToken?: string,
  ) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new BadRequestException('Користувача не знайдено');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!valid) {
      throw new BadRequestException('Поточний пароль невірний');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'Новий пароль має відрізнятися від поточного',
      );
    }

    await this.usersService.update(user.id, {
      passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
    });

    // Every other device is signed out; this one isn't, or changing your
    // password would log you out of the page you did it on.
    const sessions = await this.sessionsRepository.find({
      where: { userId: user.id },
    });
    const keepHash = keepRefreshToken ? sha256(keepRefreshToken) : null;

    for (const session of sessions) {
      if (keepHash && session.tokenHash === keepHash) continue;
      await this.sessionsRepository.delete({ id: session.id });
    }

    return { message: 'Пароль змінено' };
  }

  async getProfile(userId: number) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new BadRequestException('Користувача не знайдено');
    }

    return this.buildUserResponse(user);
  }
}

// A real bcrypt hash of a value nothing will ever submit. Only ever used to
// spend the same time on a login for an address that doesn't exist as on one
// that does — see login().
const DUMMY_HASH =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
