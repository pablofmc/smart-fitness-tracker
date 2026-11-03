import { addDays } from "@/lib/sync/streams";

export type DayValue = { day: string; value: number };

export type Baseline =
  | { available: true; value: number; low: number; high: number; mean: number; position: "below" | "within" | "above"; inputs: { rangeDays: number; recentDays: number; window: string } }
  | { available: false; reason: string };

const RANGE_DAYS = 60;
const MIN_RANGE_VALUES = 14;
const MIN_RECENT_VALUES = 3;

function meanSd(values: number[]) {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  return { mean, sd };
}

/**
 * Today against the personal normal range: the 60-day mean ± 1 SD over the 60 days ending yesterday
 * (fitness-metrics skill, R-HLT-02). `recent: 7` compares the last 7 days' mean (HRV, resting HR);
 * `recent: 1` compares today's single value (a night's sleep).
 */
export function baseline(series: DayValue[], today: string, { recent }: { recent: 1 | 7 }): Baseline {
  const rangeFrom = addDays(today, -RANGE_DAYS);
  const range = series.filter((d) => d.day >= rangeFrom && d.day < today).map((d) => d.value);
  const recentFrom = addDays(today, -(recent - 1));
  const latest = series.filter((d) => d.day >= recentFrom && d.day <= today).map((d) => d.value);
  if (range.length < MIN_RANGE_VALUES || latest.length < (recent === 1 ? 1 : MIN_RECENT_VALUES)) return { available: false, reason: "sin línea base aún" };

  const { mean, sd } = meanSd(range);
  const value = latest.reduce((s, v) => s + v, 0) / latest.length;
  const low = mean - sd;
  const high = mean + sd;
  return {
    available: true,
    value,
    low,
    high,
    mean,
    position: value < low ? "below" : value > high ? "above" : "within",
    inputs: { rangeDays: range.length, recentDays: latest.length, window: `${rangeFrom} a ${addDays(today, -1)}` },
  };
}
