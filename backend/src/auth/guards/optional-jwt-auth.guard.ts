import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Same 'jwt' passport strategy as JwtAuthGuard, but never rejects the
// request: a missing/invalid token just leaves req.user undefined instead
// of throwing, so a single route can serve both logged-in and guest users.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: unknown, user: unknown): any {
    return user || undefined;
  }
}
