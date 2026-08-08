import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, timingSafeEqual } from 'crypto';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './types/jwt-payload.type';
import { jwtRefreshSecret } from '../config/secrets';

// Refresh tokens are hashed before they're written down, so a database dump is
// no longer a set of working 30-day logins.
//
// SHA-256 rather than bcrypt, deliberately: a refresh token is a signed JWT
// with full entropy, not a human-chosen password, so there is nothing for a
// slow hash to protect against. bcrypt would also be actively wrong here — it
// truncates its input at 72 bytes, and two tokens issued to the same user share
// a far longer prefix than that, so rotation would silently stop working and an
// old token would keep validating against the new hash.
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.usersService.create({
      email: registerDto.email,
      passwordHash: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phone: registerDto.phone,
    });

    const tokens = this.generateTokens(user);
    await this.usersService.updateRefreshToken(
      user.id,
      hashRefreshToken(tokens.refreshToken),
    );

    return { ...tokens, user: this.buildUserResponse(user) };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    const tokens = this.generateTokens(user);

    await this.usersService.updateRefreshToken(
      user.id,
      hashRefreshToken(tokens.refreshToken),
    );

    return { ...tokens, user: this.buildUserResponse(user) };
  }

  private generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
      secret: jwtRefreshSecret(),
    });

    return { accessToken, refreshToken };
  }

  // Every failure here is the same 401: a caller holding a refresh token that
  // isn't good any more needs to log in, and which of the checks tripped is
  // none of their business. Previously a malformed token escaped as an
  // unhandled JsonWebTokenError and surfaced as a 500.
  // Returns the user alongside the tokens because this is also what the web
  // app calls on startup: nothing about the session is persisted client-side
  // any more, so a page load has to ask who it is. Handing the profile back
  // here makes that one round trip instead of a refresh followed by /auth/me.
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

    const user = await this.usersService.findById(payload.sub);

    if (!user?.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!hashesMatch(user.refreshToken, hashRefreshToken(refreshToken))) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = this.generateTokens(user);

    await this.usersService.updateRefreshToken(
      user.id,
      hashRefreshToken(tokens.refreshToken),
    );

    return { ...tokens, user: this.buildUserResponse(user) };
  }

  // Best-effort by design: the caller clears the cookie no matter what this
  // does, so a session that can't be identified — expired token, already
  // logged out, no cookie at all — still ends on the client. What must not
  // happen is logout failing and leaving a live refresh token behind.
  async logoutByRefreshToken(refreshToken: string | undefined) {
    if (!refreshToken) {
      return { message: 'Logged out' };
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: jwtRefreshSecret(),
      });

      await this.usersService.updateRefreshToken(payload.sub, null);
    } catch {
      // An unverifiable token revokes nothing, which is already the state we
      // want it in.
    }

    return { message: 'Logged out' };
  }
  async getProfile(userId: number) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.buildUserResponse(user);
  }
}
