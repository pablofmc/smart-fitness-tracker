import { z } from "zod";

/** Bump when parsing changes: the next sync re-parses every activity from the raw archive (R-DAT-02). */
export const ACTIVITY_PARSER_VERSION = 1;

const measure = z.number().nullish().catch(null);
const text = z.string().nullish().catch(null);

/** Every field is optional, so one that disappears breaks a screen and never the sync. */
const summarySchema = z.looseObject({
  activityId: z.number(),
  activityName: text,
  activityType: z.looseObject({ typeKey: text }).nullish().catch(null),
  startTimeLocal: z.string(),
  startTimeGMT: text,
  duration: measure,
  movingDuration: measure,
  distance: measure,
  averageHR: measure,
  maxHR: measure,
  summarizedExerciseSets: z.array(z.unknown()).nullish().catch(null),
});

export type ParsedActivity = {
  id: number;
  name: string | null;
  sport: string;
  local_day: string;
  started_at: string | null;
  duration_s: number | null;
  moving_s: number | null;
  distance_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  exercise_count: number | null;
  data: Record<string, unknown>;
};

const DAY = /^\d{4}-\d{2}-\d{2}/;

/** Returns null for a payload with no id or no local start time, which can't be placed on a day. */
export function parseActivitySummary(raw: unknown): ParsedActivity | null {
  const parsed = summarySchema.safeParse(raw);
  if (!parsed.success || !DAY.test(parsed.data.startTimeLocal)) return null;
  const summary = parsed.data;

  return {
    id: summary.activityId,
    name: summary.activityName ?? null,
    sport: summary.activityType?.typeKey ?? "unknown",
    // Garmin's local time is the watch's wall clock, which is the day the activity belongs to (R-DAT-04).
    local_day: summary.startTimeLocal.slice(0, 10),
    started_at: summary.startTimeGMT ? `${summary.startTimeGMT.replace(" ", "T")}Z` : null,
    duration_s: summary.duration ?? null,
    moving_s: summary.movingDuration ?? null,
    distance_m: summary.distance ?? null,
    avg_hr: summary.averageHR ?? null,
    max_hr: summary.maxHR ?? null,
    exercise_count: summary.summarizedExerciseSets?.length ?? null,
    data: summary,
  };
}
