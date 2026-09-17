import {
  Body,
  Delete,
  Get,
  Controller,
  Param,
  ParseIntPipe,
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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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

  // The browser's own description of itself, kept against the session so the
  // device list reads as places rather than row ids. Client-supplied text, so
  // it is bounded on write and never rendered as markup.
  private userAgentOf(request: ExpressRequest): string | undefined {
    const value = request.headers['user-agent'];

    return typeof value === 'string' ? value : undefined;
  }

  private refreshTokenOf(request: ExpressRequest): string | undefined {
    const cookies = request.cookies as Record<string, string> | undefined;

    return cookies?.[REFRESH_COOKIE];
  }

  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post('register')
  async register(
    @Req() request: ExpressRequest,
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...rest } = await this.authService.register(
      registerDto,
      this.userAgentOf(request),
    );
    setRefreshCookie(response, refreshToken);

    return rest;
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  async login(
    @Req() request: ExpressRequest,
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...rest } = await this.authService.login(
      loginDto,
      this.userAgentOf(request),
    );
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
    const { refreshToken, ...rest } = await this.authService.refresh(
      this.refreshTokenOf(request),
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
    await this.authService.logoutByRefreshToken(this.refreshTokenOf(request));
    clearRefreshCookie(response);

    return { message: 'Logged out' };
  }

  // Where am I signed in, and end any of it. A session is a row per device now
  // rather than one column on the account, which is what makes this possible
  // at all — before, signing in on a phone silently ended the desktop.
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  listSessions(
    @Req() request: ExpressRequest,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.authService.listSessions(
      req.user.id,
      this.refreshTokenOf(request),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  endSession(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.authService.endSession(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutEverywhere(
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logoutEverywhere(req.user.id);
    clearRefreshCookie(response);

    return result;
  }

  // Forgetting a password used to mean losing the account: there was no way
  // back in at all. Throttled hard — each call sends mail to an address the
  // caller chose, so an unmetered one is a way to use the shop's SMTP
  // reputation to post letters at somebody.
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  // Metered too, though the token is 32 random bytes: the limit is there so
  // the route can't be used to probe, not because guessing is plausible.
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.resetPassword(
      dto.token,
      dto.password,
    );

    // Every session on the account was just revoked, this browser's included —
    // so the cookie it still holds is worthless and shouldn't be sent again.
    clearRefreshCookie(response);

    return result;
  }

  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Req() request: ExpressRequest,
    @Request() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
      // This device keeps its session; every other one is signed out.
      this.refreshTokenOf(request),
    );
  }
}
