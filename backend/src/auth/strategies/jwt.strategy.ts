import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UsersService } from '../../users/users.service';
import { AuthenticatedUser, JwtPayload } from '../types/jwt-payload.type';
import { jwtAccessSecret } from '../../config/secrets';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtAccessSecret(),
    });
  }

  // The role now comes from the row, not from the token.
  //
  // A JWT is a snapshot of who someone was when it was signed, and this one
  // lives for fifteen minutes. Trusting `payload.role` meant a demoted admin
  // kept every admin route for the rest of that window — and `isActive` was
  // never consulted anywhere at all, so disabling an account did nothing to
  // the sessions it already had. One lookup per authenticated request buys
  // both, and it is a primary-key read.
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);

    if (!user || user.isActive === false) {
      throw new UnauthorizedException();
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}
