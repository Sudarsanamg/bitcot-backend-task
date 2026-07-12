import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { REDIS_CACHE_CLIENT } from './cache.constants';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CACHE_CLIENT)
    private readonly client: RedisClientType,
  ) {}

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const cachedValue = await this.client.get(key);

    if (!cachedValue) {
      return null;
    }

    try {
      return JSON.parse(cachedValue) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds: number) {
    await this.client.set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    });
  }

  async getOrSetJson<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cachedValue = await this.getJson<T>(key);

    if (cachedValue !== null) {
      return cachedValue;
    }

    const loadedValue = await loader();
    await this.setJson(key, loadedValue, ttlSeconds);
    return loadedValue;
  }
}