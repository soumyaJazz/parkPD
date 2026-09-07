import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { DailyLogsService } from './daily-logs.service';
import { DoseLogsService } from './dose-logs.service';

@Module({
  controllers: [LogsController],
  providers: [LogsService, DailyLogsService, DoseLogsService],
})
export class LogsModule {}
