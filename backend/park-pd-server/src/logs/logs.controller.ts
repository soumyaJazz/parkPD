import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/users.service';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';
import { ListLogsDto } from './dto/list-logs.dto';
import { LogsService } from './logs.service';

@Controller('logs')
export class LogsController {
  constructor(private logsService: LogsService) {}

  /**
   * `POST /logs` - one whole day, sent once from the review screen.
   *
   * No guard is named here on purpose: `JwtAuthGuard` is registered globally in
   * `AppModule`, so every route is protected unless it says `@Public()`. The
   * 201 Nest gives a POST by default is right for the ordinary case, and a
   * re-submit that replaces an existing day is not worth a different status the
   * client would then have to branch on.
   */
  @Post()
  createDailyLog(
    @Body() dto: CreateDailyLogDto,
    // whose log it is comes from the verified token, never from the body - a
    // caller can change what they send, not who the token says they are
    @CurrentUser() user: User,
  ) {
    return this.logsService.createDailyLog(user.id, dto);
  }

  /**
   * `GET /logs?from=2026-09-01&to=2026-09-30` - which days in a month already
   * carry a log, for the marks under the calendar's day cells.
   *
   * A range in the query string rather than a month number, because a month is
   * only one of the questions a calendar asks: a week strip or a two-month view
   * would both fit this without a second endpoint.
   */
  @Get()
  listDayStatuses(@Query() query: ListLogsDto, @CurrentUser() user: User) {
    return this.logsService.listDayStatuses(user.id, query);
  }
}
