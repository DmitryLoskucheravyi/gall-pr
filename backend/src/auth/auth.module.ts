import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

import { RefreshSession } from './entities/refresh-session.entity';
import { PasswordReset } from './entities/password-reset.entity';

import { JwtStrategy } from './strategies/jwt.strategy';
import { jwtAccessSecret } from '../config/secrets';

@Module({
  imports: [
    UsersModule,
    // The reset link is an email and nothing else — there is no other way to
    // prove you own an address you can no longer sign in with.
    MailModule,
    PassportModule,
    TypeOrmModule.forFeature([RefreshSession, PasswordReset]),
    // Access tokens only. Refresh tokens are signed with their own key, passed
    // explicitly at sign/verify time in AuthService.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtAccessSecret(),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
