import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { EmailService } from '../email/email.service';
import { REDIS_CONNECTION, type RedisConnectionConfig } from '../redis/redis.constants';
import {
  RENEWAL_REMINDERS_QUEUE,
  type RenewalReminderJobPayload,
} from './reminder.queue';

@Injectable()
export class ReminderProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderProcessor.name);
  private worker?: Worker<RenewalReminderJobPayload>;

  constructor(
    private readonly emailService: EmailService,
    @Inject(REDIS_CONNECTION)
    private readonly connection: RedisConnectionConfig,
  ) {}

  onModuleInit() {
    this.worker = new Worker<RenewalReminderJobPayload>(
      RENEWAL_REMINDERS_QUEUE,
      async (job) => {
        await this.handleJob(job);
      },
      {
        connection: this.connection,
        concurrency: 5,
      },
    );

    this.worker.on('failed', (job, error) => {
      if (!job) {
        return;
      }

      this.logger.error(
        `Renewal reminder job failed for subscription ${job.data.subscriptionId} (attempt ${job.attemptsMade + 1}/${job.opts.attempts ?? 1})`,
        error instanceof Error ? error.stack : undefined,
      );
    });

    this.logger.log('Renewal reminders worker started');
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handleJob(job: Job<RenewalReminderJobPayload>) {
    await this.emailService.sendRenewalReminder({
      customerName: job.data.customerName,
      customerEmail: job.data.customerEmail,
      subscriptionPlan: job.data.plan,
      billingInterval: job.data.billingInterval,
      subscriptionExpiryDate: job.data.expiryDate,
    });

    this.logger.log(
      `Renewal reminder email sent for subscription ${job.data.subscriptionId}`,
    );
  }
}