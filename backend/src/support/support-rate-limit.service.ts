import { Injectable } from '@nestjs/common';

// Websocket messages never pass through the HTTP throttler — see the note in
// common/throttler.guard.ts — so the gateway needs a counter of its own.
//
// Two windows, because they stop different things. Per socket bounds one
// conversation: a customer typing fast is nowhere near it, a script in a loop
// is. Per address bounds the whole client: opening a fresh socket per message
// would otherwise reset the per-socket count every time, and a guest token
// costs nothing to mint, so "one socket per identity" is not a limit at all.
const PER_SOCKET = { windowMs: 60_000, limit: 20 };
const PER_ADDRESS = { windowMs: 60_000, limit: 60 };

// Sockets outnumber addresses and die often, so sweep on a timer rather than
// let the address map grow for the life of the process.
const SWEEP_MS = 5 * 60_000;

type Window = { count: number; resetAt: number };

@Injectable()
export class SupportRateLimitService {
  private readonly sockets = new Map<string, Window>();
  private readonly addresses = new Map<string, Window>();

  constructor() {
    const timer = setInterval(() => this.sweep(), SWEEP_MS);
    // Don't hold the event loop open on shutdown for a housekeeping timer.
    timer.unref();
  }

  // True when the message is allowed. Both windows are consumed on every call,
  // so a caller can't spend the cheaper budget to avoid the stricter one.
  allowMessage(socketId: string, address: string): boolean {
    const socketOk = this.consume(this.sockets, socketId, PER_SOCKET);
    const addressOk = this.consume(this.addresses, address, PER_ADDRESS);

    return socketOk && addressOk;
  }

  releaseSocket(socketId: string): void {
    this.sockets.delete(socketId);
  }

  private consume(
    store: Map<string, Window>,
    key: string,
    rule: { windowMs: number; limit: number },
  ): boolean {
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + rule.windowMs });
      return true;
    }

    existing.count += 1;

    return existing.count <= rule.limit;
  }

  private sweep(): void {
    const now = Date.now();

    for (const store of [this.sockets, this.addresses]) {
      for (const [key, window] of store) {
        if (window.resetAt <= now) {
          store.delete(key);
        }
      }
    }
  }
}
