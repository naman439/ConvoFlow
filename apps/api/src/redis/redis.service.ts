import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 5) {
          this.logger.warn('Redis max retries reached, disabling Redis');
          return null;
        }
        return Math.min(times * 500, 3000);
      },
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log('✅ Redis connected');
    });

    this.client.on('close', () => {
      this.isConnected = false;
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
    } catch (error) {
      this.logger.warn('Redis connection failed — running without Redis cache');
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  get isAvailable(): boolean {
    return this.isConnected;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // Graceful degradation
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.del(key);
    } catch {
      // Graceful degradation
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.hset(key, field, value);
    } catch {
      // Graceful degradation
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.isConnected) return null;
    try {
      return await this.client.hget(key, field);
    } catch {
      return null;
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.hdel(key, field);
    } catch {
      // Graceful degradation
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.isConnected) return {};
    try {
      return await this.client.hgetall(key);
    } catch {
      return {};
    }
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.sadd(key, ...members);
    } catch {
      // Graceful degradation
    }
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.srem(key, ...members);
    } catch {
      // Graceful degradation
    }
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.isConnected) return [];
    try {
      return await this.client.smembers(key);
    } catch {
      return [];
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    if (!this.isConnected) return false;
    try {
      return (await this.client.sismember(key, member)) === 1;
    } catch {
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.expire(key, ttlSeconds);
    } catch {
      // Graceful degradation
    }
  }
}
