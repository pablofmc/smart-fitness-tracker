/** Health history reaches back to the first device (`docs/garmin-api.md`). */
export const HISTORY_START = "2022-11-01";

export type Request = { path: string; params?: Record<string, string> };

export type RangeStream = {
  name: string;
  /** Largest window per call. Unmeasured streams use 28, the smallest limit measured on any endpoint. */
  maxDays: number;
  request: (start: string, end: string) => Request;
};

const byDates = (path: string) => (start: string, end: string) => ({ path, params: { startDate: start, endDate: end } });
const inPath = (path: string) => (start: string, end: string) => ({ path: `${path}/${start}/${end}` });

export const RANGE_STREAMS: RangeStream[] = [
  { name: "hrv_summaries", maxDays: 365, request: inPath("/hrv-service/hrv/daily") },
  { name: "daily_summaries", maxDays: 100, request: byDates("/usersummary-service/v2/dailysummaries") },
  { name: "sleep_summaries", maxDays: 31, request: byDates("/sleep-service/sleep/dailySleepSummariesByDate") },
  { name: "body_battery", maxDays: 31, request: byDates("/wellness-service/wellness/bodyBattery/reports/daily") },
  { name: "stress", maxDays: 28, request: inPath("/usersummary-service/stats/stress/daily") },
  { name: "steps", maxDays: 28, request: inPath("/usersummary-service/stats/steps/daily") },
  { name: "hydration", maxDays: 28, request: inPath("/usersummary-service/stats/hydration/daily") },
  {
    name: "weight",
    maxDays: 28,
    request: (start, end) => ({ path: `/weight-service/weight/range/${start}/${end}`, params: { includeAll: "true" } }),
  },
  { name: "wellness_activity", maxDays: 28, request: inPath("/wellnessactivity-service/activity/summary/range") },
  { name: "sleep_daily", maxDays: 1, request: (day) => ({ path: "/sleep-service/sleep/dailySleep", params: { date: day } }) },
  { name: "hrv_daily", maxDays: 1, request: (day) => ({ path: `/hrv-service/hrv/${day}` }) },
  { name: "heart_rate_daily", maxDays: 1, request: (day) => ({ path: "/wellness-service/wellness/dailyHeartRate", params: { date: day } }) },
  { name: "spo2_daily", maxDays: 1, request: (day) => ({ path: `/wellness-service/wellness/daily/spo2acclimation/${day}` }) },
  { name: "fitness_age", maxDays: 1, request: (day) => ({ path: `/fitnessage-service/fitnessage/v2/${day}` }) },
  { name: "food_logs", maxDays: 1, request: (day) => ({ path: `/nutrition-service/food/logs/${day}` }) },
];

/** Payloads with no date, archived again whenever they change. */
export const SNAPSHOT_STREAMS: { name: string; path: string }[] = [
  { name: "heart_rate_zones", path: "/biometric-service/heartRateZones/v2" },
  { name: "profile_settings", path: "/userprofile-service/userprofile/settings" },
];

const DAY_MS = 86_400_000;
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const toMs = (day: string) => Date.parse(`${day}T00:00:00Z`);

export function addDays(day: string, days: number) {
  return toDay(toMs(day) + days * DAY_MS);
}

/**
 * Windows sit on a fixed grid from HISTORY_START, so a day always falls in the same window and
 * re-fetching it replaces the same archived object (R-SYN-06). The start is the window's key.
 */
export function windowStart(day: string, maxDays: number) {
  const index = Math.floor((toMs(day) - toMs(HISTORY_START)) / DAY_MS / maxDays);
  return addDays(HISTORY_START, index * maxDays);
}

export function windowEnd(start: string, maxDays: number, today: string) {
  const end = addDays(start, maxDays - 1);
  return end < today ? end : today;
}

/** How far a chronological load has come, from 0 to 1. */
export function historyFraction(position: string | null, today: string) {
  if (!position) return 0;
  const total = toMs(today) - toMs(HISTORY_START);
  return total <= 0 ? 1 : Math.min(1, Math.max(0, (toMs(position) - toMs(HISTORY_START)) / total));
}

/** Calls a stream needs to cover the whole history, so a one-call-per-day stream weighs what it costs. */
export function historyCalls(maxDays: number, today: string) {
  return Math.ceil((toMs(today) - toMs(HISTORY_START)) / DAY_MS / maxDays);
}

/** Share of calls done, 0 to 1. Averaging streams evenly would run ahead of the real wait. */
export function weightedProgress(parts: { calls: number; fraction: number }[]) {
  const total = parts.reduce((sum, part) => sum + part.calls, 0);
  return total === 0 ? 1 : parts.reduce((sum, part) => sum + part.calls * part.fraction, 0) / total;
}
