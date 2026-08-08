import {
  Body,
  Get,
  Controller,
  Request,
  UseGuards,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { AuthenticatedRequest } from './types/authenticated-request.type';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Registration is a write that creates a user and sends nothing to verify
  // it, so the ceiling here is about stopping bulk account creation.
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // The one route where an attacker's whole plan is "try again": passwords
  // only have to clear MinLength(6), so unmetered attempts are the real
  // weakness rather than the hashing. 10/min still leaves room for a person
  // fumbling their own password.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.id);
  }

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Request() req: AuthenticatedRequest) {
    return this.authService.logout(req.user.id);
  }
}
