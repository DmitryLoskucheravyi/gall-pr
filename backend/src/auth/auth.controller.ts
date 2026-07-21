import {
  Body,
  Get,
  Controller,
  Request,
  UseGuards,
  Post,
} from '@nestjs/common';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { AuthenticatedRequest } from './types/authenticated-request.type';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.id);
  }

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
