import { Injectable } from '@nestjs/common';

@Injectable()
export class SupportPresenceService {
  private readonly onlineUserIds = new Set<number>();

  markOnline(userId: number) {
    this.onlineUserIds.add(userId);
  }

  markOffline(userId: number) {
    this.onlineUserIds.delete(userId);
  }

  isOnline(userId: number): boolean {
    return this.onlineUserIds.has(userId);
  }
}
