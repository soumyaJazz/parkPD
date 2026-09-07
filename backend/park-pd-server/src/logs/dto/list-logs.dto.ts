import { Matches } from 'class-validator';

/** `YYYY-MM-DD`, as in `CreateDailyLogDto`. Shape only - the service checks
 * that the day exists and that the two make a range that runs forwards. */
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Which days the calendar is asking about.
 *
 * A range rather than "everything", because the calendar only ever draws one
 * month: sending a year of days to fill in thirty cells is work the phone then
 * has to throw away, and it only gets worse the longer someone uses the app.
 *
 * Both ends are included - `from` and `to` are the first and last day drawn.
 */
export class ListLogsDto {
  @Matches(DAY_KEY, { message: 'Choose which days to show.' })
  from!: string;

  @Matches(DAY_KEY, { message: 'Choose which days to show.' })
  to!: string;
}
