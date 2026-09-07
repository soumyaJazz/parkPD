import type { DailyLogRequest, DayStatusMap } from '../types/dailyLog';
import { get, post } from './client';
import type { ApiResult } from './client';

/** What `POST /logs` hands back: the day as the server now holds it. */
export type DailyLogResult = {
  /** `YYYY-MM-DD`, echoed so the caller can mark the right day as logged. */
  log_date: string;
};

/**
 * Sends a whole day in one request.
 *
 * One request rather than one per section: a half-saved day is worse than an
 * unsaved one - it would read as logged on the calendar while missing the
 * doses - so every screen hands its answers forward and only the review
 * submits.
 */
export function submitDailyLog(
  payload: DailyLogRequest,
): Promise<ApiResult<DailyLogResult>> {
  return post<DailyLogResult>('/logs', payload);
}

/** What `GET /logs` hands back: only the days that carry a log. */
export type DayStatusesResult = {
  /**
   * Keyed by `dayKey()`. Days with nothing to say are absent rather than
   * listed as empty - a month is mostly days nobody has logged.
   */
  statuses: DayStatusMap;
};

/**
 * Which days between two dates already carry a log.
 *
 * A range rather than "everything this account has": the calendar draws one
 * month at a time, and a year of days to fill in thirty cells is work the
 * phone would only throw away - more of it every month the app is used.
 *
 * Both ends are included: `from` and `to` are the first and last cells drawn.
 */
export function fetchDayStatuses(
  from: string,
  to: string,
): Promise<ApiResult<DayStatusesResult>> {
  return get<DayStatusesResult>(
    `/logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}
