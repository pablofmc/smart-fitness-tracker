import type { DayValue } from "@/lib/metrics/baseline";

export type HealthDay = { kind: string; day: string; data: unknown };

/** Where a metric's value sits in one payload kind. `scale` converts units; `combine` reads an object field. */
export type Source = { kind: string; path: string[]; scale?: number; combine?: (value: Record<string, unknown>) => number | undefined };

export type HealthMetric = {
  key: string;
  label: string;
  unit: string;
  /** The first source with a value for a day wins, so a detailed daily payload beats a range summary. */
  sources: Source[];
  /** Which direction is good, for colouring a change; null when neither is. */
  better: "higher" | "lower" | null;
  /** Weight may truly be 0 in no case, but other readings of 0 mean "not measured" in Garmin's payloads. */
  zeroMeansMissing: boolean;
};

const H = 1 / 3600;

/** Every health metric the app charts (R-HLT-03), with the Garmin fields it comes from. */
export const HEALTH_METRICS: HealthMetric[] = [
  { key: "sleep", label: "Sueño", unit: "h", better: "higher", zeroMeansMissing: true, sources: [{ kind: "sleep_daily", path: ["sleepTimeSeconds"], scale: H }, { kind: "sleep_summaries", path: ["sleepTimeSeconds"], scale: H }] },
  { key: "sleepScore", label: "Puntuación de sueño", unit: "", better: "higher", zeroMeansMissing: true, sources: [{ kind: "sleep_daily", path: ["sleepScores", "overall", "value"] }, { kind: "sleep_summaries", path: ["sleepScores", "overall", "value"] }] },
  { key: "deepSleep", label: "Sueño profundo", unit: "h", better: "higher", zeroMeansMissing: true, sources: [{ kind: "sleep_daily", path: ["deepSleepSeconds"], scale: H }, { kind: "sleep_summaries", path: ["deepSleepSeconds"], scale: H }] },
  { key: "remSleep", label: "Sueño REM", unit: "h", better: "higher", zeroMeansMissing: true, sources: [{ kind: "sleep_daily", path: ["remSleepSeconds"], scale: H }, { kind: "sleep_summaries", path: ["remSleepSeconds"], scale: H }] },
  { key: "hrv", label: "HRV", unit: "ms", better: "higher", zeroMeansMissing: true, sources: [{ kind: "hrv_daily", path: ["hrvSummary", "lastNightAvg"] }, { kind: "hrv_summaries", path: ["lastNightAvg"] }] },
  { key: "restingHr", label: "FC en reposo", unit: "lpm", better: "lower", zeroMeansMissing: true, sources: [{ kind: "heart_rate_daily", path: ["restingHeartRate"] }, { kind: "daily_summaries", path: ["heartRate", "restingValue"] }] },
  { key: "bodyBattery", label: "Body Battery máx.", unit: "", better: "higher", zeroMeansMissing: true, sources: [{ kind: "daily_summaries", path: ["bodyBattery", "maxValue"] }] },
  { key: "bodyBatteryCharged", label: "Body Battery recargado", unit: "", better: "higher", zeroMeansMissing: true, sources: [{ kind: "daily_summaries", path: ["bodyBattery", "chargedValue"] }, { kind: "body_battery", path: ["charged"] }] },
  { key: "stress", label: "Estrés medio", unit: "", better: "lower", zeroMeansMissing: true, sources: [{ kind: "daily_summaries", path: ["stress", "avgLevel"] }, { kind: "stress", path: ["values", "overallStressLevel"] }] },
  { key: "steps", label: "Pasos", unit: "", better: "higher", zeroMeansMissing: true, sources: [{ kind: "daily_summaries", path: ["movement", "steps"] }, { kind: "steps", path: ["totalSteps"] }] },
  { key: "respiration", label: "Respiración media", unit: "rpm", better: null, zeroMeansMissing: true, sources: [{ kind: "daily_summaries", path: ["respiration", "avgValue"] }, { kind: "sleep_daily", path: ["averageRespirationValue"] }] },
  { key: "spo2", label: "SpO2 media", unit: "%", better: "higher", zeroMeansMissing: true, sources: [{ kind: "spo2_daily", path: ["averageSpO2"] }, { kind: "sleep_daily", path: ["averageSpO2Value"] }] },
  {
    key: "intensityMinutes",
    label: "Minutos de intensidad",
    unit: "min",
    better: "higher",
    zeroMeansMissing: false,
    // Garmin counts vigorous minutes double toward its weekly goal; we keep that convention.
    sources: [{ kind: "daily_summaries", path: ["intensityMinutes"], combine: (v) => (typeof v.moderate === "number" || typeof v.vigorous === "number" ? (Number(v.moderate) || 0) + (Number(v.vigorous) || 0) * 2 : undefined) }],
  },
  { key: "weight", label: "Peso", unit: "kg", better: null, zeroMeansMissing: true, sources: [{ kind: "weight", path: ["latestWeight", "weight"], scale: 1 / 1000 }] },
];

export const HEALTH_METRIC_KINDS = [...new Set(HEALTH_METRICS.flatMap((m) => m.sources.map((s) => s.kind)))];

export function metricByKey(key: string) {
  return HEALTH_METRICS.find((m) => m.key === key);
}

/** Turns the raw field a source points at into a number, or undefined when it's missing. */
export function readSource(source: Source, raw: unknown): number | undefined {
  if (source.combine) return raw && typeof raw === "object" ? source.combine(raw as Record<string, unknown>) : undefined;
  return typeof raw === "number" && Number.isFinite(raw) ? raw * (source.scale ?? 1) : undefined;
}

const at = (data: unknown, path: string[]) =>
  path.reduce<unknown>((value, key) => (value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined), data);

/**
 * One value per day: the first source with a reading wins. `fields` holds, per source index, the raw
 * field for each day. A missing reading (or a 0 that means "not measured") leaves the day out.
 */
export function combineSources(metric: HealthMetric, fields: { day: string; raw: unknown }[][]): DayValue[] {
  const byDay = new Map<string, number>();
  metric.sources.forEach((source, index) => {
    for (const { day, raw } of fields[index] ?? []) {
      if (byDay.has(day)) continue;
      const value = readSource(source, raw);
      if (value === undefined || (metric.zeroMeansMissing && value === 0)) continue;
      byDay.set(day, value);
    }
  });
  return [...byDay].map(([day, value]) => ({ day, value })).sort((a, b) => a.day.localeCompare(b.day));
}

/** The same, from whole health-day payloads. */
export function metricSeries(metric: HealthMetric, days: HealthDay[]): DayValue[] {
  return combineSources(
    metric,
    metric.sources.map((source) => days.filter((d) => d.kind === source.kind).map((d) => ({ day: d.day, raw: at(d.data, source.path) }))),
  );
}
