import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('active-subscribers')
  async getActiveSubscribers() {
    return this.analyticsService.getActiveSubscribers();
  }

  @Get('revenue')
  async getRevenueTotals() {
    return this.analyticsService.getRevenueTotals();
  }

  @Get('summary')
  async getPlatformSummary() {
    return this.analyticsService.getPlatformSummary();
  }
}