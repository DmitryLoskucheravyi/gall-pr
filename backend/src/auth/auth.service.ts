import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './types/jwt-payload.type';

const CODE_TTL_MS = 15 * 60 * 1000; // 15 min
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 s
const MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  // Generates a fresh 6-digit code, stores its hash + expiry on the user, and
  // emails it. Returns nothing sensitive.
  private async issueVerificationCode(user: User) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const verificationCodeHash = await bcrypt.hash(code, 10);

    await this.usersService.update(user.id, {
      verificationCodeHash,
      verificationExpiresAt: new Date(Date.now() + CODE_TTL_MS),
      verificationSentAt: new Date(),
      verificationAttempts: 0,
    });

    await this.mailService.sendVerificationCode(
      user.email,
      code,
      user.firstName,
    );
  }

  private buildUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
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
      isVerified: false,
    });

    await this.issueVerificationCode(user);

    // Auto-login as an unverified account: the user can browse, but verified
    // status gates checkout (see OrdersService). The frontend routes them to
    // the code-entry screen right after registration.
    const tokens = this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return { ...tokens, user: this.buildUserResponse(user) };
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    if (user.isVerified) return { user: this.buildUserResponse(user) };

    if (
      !user.verificationCodeHash ||
      !user.verificationExpiresAt ||
      user.verificationExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Код прострочений. Надішліть новий.');
    }

    if (user.verificationAttempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Забагато спроб. Надішліть новий код.',
      );
    }

    const isValid = await bcrypt.compare(code, user.verificationCodeHash);
    if (!isValid) {
      await this.usersService.update(user.id, {
        verificationAttempts: user.verificationAttempts + 1,
      });
      throw new BadRequestException('Невірний код.');
    }

    await this.usersService.update(user.id, {
      isVerified: true,
      verificationCodeHash: null,
      verificationExpiresAt: null,
      verificationSentAt: null,
      verificationAttempts: 0,
    });

    return { user: { ...this.buildUserResponse(user), isVerified: true } };
  }

  async resendCode(email: string) {
    const user = await this.usersService.findByEmail(email);
    // Don't reveal whether the email exists.
    if (!user || user.isVerified) return { message: 'ok' };

    if (
      user.verificationSentAt &&
      Date.now() - user.verificationSentAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      throw new BadRequestException(
        'Зачекайте хвилину перед повторною відправкою.',
      );
    }

    await this.issueVerificationCode(user);
    return { message: 'ok' };
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

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return { ...tokens, user: this.buildUserResponse(user) };
  }

  private generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    const payload = this.jwtService.verify<JwtPayload>(refreshToken);

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.refreshToken !== refreshToken) {
      throw new BadRequestException('Invalid refresh token');
    }

    const tokens = this.generateTokens(user);

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: number) {
    await this.usersService.updateRefreshToken(userId, null);

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
