/** Bump when splitting changes: the next syncs re-parse every health file (R-DAT-02). */
export const HEALTH_PARSER_VERSION = 1;

/** Payloads that cover a single day, keyed by that day in the raw archive. */
const SINGLE_DAY_KINDS = new Set(["sleep_daily", "hrv_daily", "heart_rate_daily", "spo2_daily", "fitness_age", "food_logs"]);

/** Range payloads keep their days in a list, sometimes wrapped in an object. */
const LIST_FIELDS = ["hrvSummaries", "data", "dailyWeightSummaries"];
const DAY_FIELDS = ["calendarDate", "date", "summaryDate"];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const HEALTH_KINDS = [
  ...SINGLE_DAY_KINDS,
  "hrv_summaries",
  "daily_summaries",
  "sleep_summaries",
  "body_battery",
  "stress",
  "steps",
  "hydration",
  "weight",
  "wellness_activity",
];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function dayOf(item: Record<string, unknown>) {
  for (const field of DAY_FIELDS) {
    const value = item[field];
    if (typeof value === "string" && DAY.test(value.slice(0, 10))) return value.slice(0, 10);
  }
  return null;
}

/**
 * Splits one archived payload into calendar days, keeping every field (R-DAT-03).
 * An item with no recognisable day is skipped rather than guessed. Days are Garmin's calendar
 * days, which follow the watch's local time (R-DAT-04).
 */
export function splitHealthPayload(kind: string, sourceKey: string, payload: unknown): { day: string; data: Record<string, unknown> }[] {
  if (SINGLE_DAY_KINDS.has(kind)) {
    if (!DAY.test(sourceKey) || !isRecord(payload)) return [];
    return [{ day: sourceKey, data: payload }];
  }

  const list = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? (LIST_FIELDS.map((field) => payload[field]).find(Array.isArray) ?? [])
      : [];

  const days = new Map<string, Record<string, unknown>>();
  for (const item of list) {
    if (!isRecord(item)) continue;
    const day = dayOf(item);
    if (day) days.set(day, item);
  }
  return [...days].map(([day, data]) => ({ day, data }));
}
