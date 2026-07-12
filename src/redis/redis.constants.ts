export const REDIS_CONNECTION = Symbol('REDIS_CONNECTION');

export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
}