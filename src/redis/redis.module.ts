import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CONNECTION, type RedisConnectionConfig } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CONNECTION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): RedisConnectionConfig => {
        const host = configService.get<string>('REDIS_HOST');
        const portValue = configService.get<string>('REDIS_PORT');

        if (!host) {
          throw new Error('REDIS_HOST is not configured');
        }

        if (!portValue) {
          throw new Error('REDIS_PORT is not configured');
        }

        const port = Number(portValue);

        if (!Number.isInteger(port) || port <= 0) {
          throw new Error('REDIS_PORT must be a positive integer');
        }

        const password = configService.get<string>('REDIS_PASSWORD') || undefined;

        return {
          host,
          port,
          password,
          maxRetriesPerRequest: null,
        };
      },
    },
  ],
  exports: [REDIS_CONNECTION],
})
export class RedisModule {}