import type { DailyLogRequest } from '../types/dailyLog';
import { post } from './client';
import type { ApiResult } from './client';

/** What `POST /logs` hands back: the day as the server now holds it. */
export type DailyLogResult = {
  /** `YYYY-MM-DD`, echoed so the caller can mark the right day as logged. */
  date: string;
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
