import type { DayInsights } from '../types/insights';
import { get } from './client';
import type { ApiResult } from './client';

/**
 * One day's activity chart.
 *
 * With no date, the server answers with the last day this account logged -
 * which is what the Insights screen opens on. The phone cannot know which day
 * that is without first asking which days have logs and then asking again, and
 * the server can say it in one.
 *
 * `data` comes back null for an account that has never logged a day. That is
 * not a failure: the `message` beside it says so in words, and the screen shows
 * it rather than inventing copy of its own.
 */
export function fetchDayInsights(
  date?: string,
): Promise<ApiResult<DayInsights | null>> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return get<DayInsights | null>(`/logs/insights${query}`);
}
