import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { UsersModule } from '../users/users.module';

import { JwtStrategy } from './strategies/jwt.strategy';
import { jwtAccessSecret } from '../config/secrets';

@Module({
  imports: [
    UsersModule,
    PassportModule,
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
