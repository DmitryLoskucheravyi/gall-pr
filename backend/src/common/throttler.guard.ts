import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// ThrottlerGuard reads req/res off the HTTP context. Registered globally it
// also lands on the support gateway's @SubscribeMessage handlers, where
// switchToHttp() has nothing to hand it — so every socket message would fail.
// Websocket traffic is already bounded by the handshake being authenticated;
// skip it here rather than give up global HTTP coverage.
@Injectable()
export class HttpOnlyThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    return super.canActivate(context);
  }
}
