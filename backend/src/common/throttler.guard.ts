import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// ThrottlerGuard reads req/res off the HTTP context. Registered globally it
// also lands on the support gateway's @SubscribeMessage handlers, where
// switchToHttp() has nothing to hand it — so every socket message would fail.
// Skipping non-HTTP here is what keeps global coverage possible at all.
//
// It does mean websocket traffic is not metered by this guard, and nothing
// about the handshake makes up for that: support is open to guests, and a
// guest identifies with a token the client generates for itself, so anyone can
// mint as many identities as they like. The gateway therefore carries its own
// counter — see SupportRateLimitService, which is what actually bounds
// support:message.
@Injectable()
export class HttpOnlyThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    return super.canActivate(context);
  }
}
