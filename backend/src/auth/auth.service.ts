import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './types/jwt-payload.type';

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
      isVerified: user.isVerified,
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

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

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
