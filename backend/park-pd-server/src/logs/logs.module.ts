import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { DailyLogsService } from './daily-logs.service';
import { DayInsightsService } from './day-insights.service';
import { DoseLogsService } from './dose-logs.service';

@Module({
  controllers: [LogsController],
  providers: [
    LogsService,
    DailyLogsService,
    DayInsightsService,
    DoseLogsService,
  ],
})
export class LogsModule {}
