import { Global, Module } from '@nestjs/common';
import { createClient } from 'redis';
import { REDIS_CONNECTION, type RedisConnectionConfig } from '../redis/redis.constants';
import { RedisModule } from '../redis/redis.module';
import { REDIS_CACHE_CLIENT } from './cache.constants';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    {
      provide: REDIS_CACHE_CLIENT,
      inject: [REDIS_CONNECTION],
      useFactory: async (connection: RedisConnectionConfig) => {
        const client = createClient({
          socket: {
            host: connection.host,
            port: connection.port,
          },
          password: connection.password,
        });

        client.on('error', (error) => {
          // Redis connection problems should be visible in logs during startup and runtime.
          console.error('Redis cache client error:', error);
        });

        await client.connect();
        return client;
      },
    },
    RedisCacheService,
  ],
  exports: [RedisCacheService],
})
export class RedisCacheModule {}