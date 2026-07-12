import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { RedisModule } from '../redis/redis.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ReminderCronService } from './reminder.cron';
import { ReminderProcessor } from './reminder.processor';
import { ReminderQueueService } from './reminder.queue';

@Module({
  imports: [EmailModule, RedisModule, SubscriptionModule],
  providers: [ReminderCronService, ReminderProcessor, ReminderQueueService],
})
export class JobsModule {}