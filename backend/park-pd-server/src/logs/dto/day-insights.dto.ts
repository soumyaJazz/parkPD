import { IsOptional, Matches } from 'class-validator';

/** `YYYY-MM-DD`, as in `ListLogsDto`. Shape only - the service checks the rest. */
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Which day the chart is being asked for.
 *
 * Optional, and absent is the ordinary case: the screen opens on the last day
 * the person logged, which only the server knows. Naming a day is what the
 * calendar will do later, and the endpoint already answers it - so the two
 * never need a second route between them.
 */
export class DayInsightsDto {
  @IsOptional()
  @Matches(DAY_KEY, { message: 'Choose a real date to show.' })
  date?: string;
}
