import type { DayValue } from "./baseline";

export type Scale = "semanas" | "meses" | "años";

function bucketOf(day: string, scale: Scale) {
  if (scale === "años") return day.slice(0, 4);
  if (scale === "meses") return day.slice(0, 7);
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/** Mean per week (Monday start), month or year, with how many days fed each value (R-HLT-03). */
export function bucketMeans(series: DayValue[], scale: Scale) {
  const buckets = new Map<string, { sum: number; n: number }>();
  for (const { day, value } of series) {
    const key = bucketOf(day, scale);
    const b = buckets.get(key) ?? { sum: 0, n: 0 };
    buckets.set(key, { sum: b.sum + value, n: b.n + 1 });
  }
  return [...buckets].sort((a, b) => a[0].localeCompare(b[0])).map(([bucket, { sum, n }]) => ({ bucket, mean: sum / n, days: n }));
}
