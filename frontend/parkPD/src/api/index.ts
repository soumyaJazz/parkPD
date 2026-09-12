export {
  fetchMe,
  isDeadChallenge,
  logout,
  requestOtp,
  verifyOtp,
} from './auth';
export type {
  AuthUser,
  OtpChallenge,
  VerifiedSession,
  VerifyFailureReason,
} from './auth';
export { ApiError, onSessionEnded } from './client';
export { fetchDayStatuses, submitDailyLog } from './dailyLog';
export type { DailyLogResult, DayStatusesResult } from './dailyLog';
export { fetchDayInsights } from './insights';
export type { ApiResult } from './client';
export { completeProfile, updateProfile } from './profile';
export type { ProfileResult } from './profile';
