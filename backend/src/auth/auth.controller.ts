import {
  Body,
  Get,
  Controller,
  Req,
  Res,
  Request,
  UseGuards,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest, Response } from 'express';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  setRefreshCookie,
} from './auth.cookie';
import type { AuthenticatedRequest } from './types/authenticated-request.type';

// The refresh token never reaches JavaScript. It is set as an httpOnly cookie
// and read back from one; only the 15-minute access token is handed to the
// client, which keeps it in memory rather than in localStorage.
//
// The point isn't that this prevents XSS — it doesn't. It bounds it: a script
// on the page can act as the user while it is running, but it cannot take the
// credential away and keep using it for the next month from somewhere else.
//
// passthrough: true on @Res so these still return objects and Nest serialises
// them as usual — without it, taking the response object turns the handler
// into one that must write the response itself.
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...rest } = await this.authService.register(registerDto);
    setRefreshCookie(response, refreshToken);

    return rest;
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...rest } = await this.authService.login(loginDto);
    setRefreshCookie(response, refreshToken);

    return rest;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.id);
  }

  // Also the app's startup call: the client has no persisted session any more,
  // so on every page load it asks this route who it is. The cookie is the only
  // input — nothing is read from the body — and the user comes back with the
  // token so a reload costs one round trip rather than two.
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('refresh')
  async refresh(
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, string> | undefined;

    const { refreshToken, ...rest } = await this.authService.refresh(
      cookies?.[REFRESH_COOKIE],
    );
    setRefreshCookie(response, refreshToken);

    return rest;
  }

  // No guard on purpose. Logging out has to work when the access token has
  // already expired — otherwise the one moment a user most wants to end a
  // session is the moment the button stops working, and the cookie stays.
  // The cookie identifies the session to revoke, and clearing it is
  // unconditional, so this is safe to call twice or with nothing at all.
  @Post('logout')
  async logout(
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, string> | undefined;

    await this.authService.logoutByRefreshToken(cookies?.[REFRESH_COOKIE]);
    clearRefreshCookie(response);

    return { message: 'Logged out' };
  }
}
