import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { REDIS_CONNECTION, type RedisConnectionConfig } from '../redis/redis.constants';
import type { RenewalReminderCandidate } from '../subscription/subscription.service';

export type RenewalReminderJobPayload = RenewalReminderCandidate;

export const RENEWAL_REMINDERS_QUEUE = 'renewal-reminders';
export const RENEWAL_REMINDER_JOB = 'send-renewal-reminder';

@Injectable()
export class ReminderQueueService implements OnModuleDestroy {
  private readonly queue: Queue<RenewalReminderJobPayload>;

  constructor(
    @Inject(REDIS_CONNECTION)
    connection: RedisConnectionConfig,
  ) {
    this.queue = new Queue<RenewalReminderJobPayload>(RENEWAL_REMINDERS_QUEUE, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  enqueueReminderJob(payload: RenewalReminderJobPayload) {
    return this.queue.add(RENEWAL_REMINDER_JOB, payload);
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}