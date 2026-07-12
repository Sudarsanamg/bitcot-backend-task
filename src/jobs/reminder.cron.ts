import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionService } from '../subscription/subscription.service';
import { ReminderQueueService } from './reminder.queue';

@Injectable()
export class ReminderCronService {
  private readonly logger = new Logger(ReminderCronService.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly reminderQueueService: ReminderQueueService,
  ) {}

@Cron('*/5 * * * *')
  async enqueueRenewalReminders() {
    this.logger.log('Subscription renewal reminder cron started');

    const candidates = await this.subscriptionService.findRenewalReminderCandidates();

    this.logger.log(
      `Found ${candidates.length} subscription(s) expiring within the next 3 days`,
    );

    let enqueuedCount = 0;

    for (const candidate of candidates) {
      try {
        await this.reminderQueueService.enqueueReminderJob(candidate);
        enqueuedCount += 1;
      } catch (error: unknown) {
        this.logger.error(
          `Failed to enqueue renewal reminder for subscription ${candidate.subscriptionId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    this.logger.log(`Enqueued ${enqueuedCount} renewal reminder job(s)`);
  }
}