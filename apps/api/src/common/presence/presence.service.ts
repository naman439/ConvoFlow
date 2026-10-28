import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service.js';

const PRESENCE_KEY = 'presence:online';
const PRESENCE_TTL = 30; // seconds

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  // Fallback in-memory store when Redis is unavailable
  private readonly memoryStore = new Set<string>();

  constructor(private readonly redis: RedisService) {}

  async setOnline(userId: string): Promise<void> {
    this.memoryStore.add(userId);
    await this.redis.sadd(PRESENCE_KEY, userId);
    await this.redis.expire(PRESENCE_KEY, 3600);
    await this.redis.set(`presence:user:${userId}`, 'online', PRESENCE_TTL);
    this.logger.debug(`User ${userId} is ONLINE`);
  }

  async setOffline(userId: string): Promise<void> {
    this.memoryStore.delete(userId);
    await this.redis.srem(PRESENCE_KEY, userId);
    await this.redis.del(`presence:user:${userId}`);
    this.logger.debug(`User ${userId} is OFFLINE`);
  }

  async isOnline(userId: string): Promise<boolean> {
    if (this.redis.isAvailable) {
      return this.redis.sismember(PRESENCE_KEY, userId);
    }
    return this.memoryStore.has(userId);
  }

  async getOnlineUsers(): Promise<string[]> {
    if (this.redis.isAvailable) {
      return this.redis.smembers(PRESENCE_KEY);
    }
    return Array.from(this.memoryStore);
  }

  async refreshPresence(userId: string): Promise<void> {
    if (await this.isOnline(userId)) {
      await this.redis.set(`presence:user:${userId}`, 'online', PRESENCE_TTL);
    }
  }
}
