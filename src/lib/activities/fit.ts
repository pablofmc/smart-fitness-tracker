import { Decoder, Stream } from "@garmin/fitsdk";
import { unzipSync } from "fflate";

/** One point per second or so, as recorded. Every field may be missing. */
export type FitRecord = {
  timestamp?: Date;
  heartRate?: number;
  enhancedSpeed?: number;
  enhancedAltitude?: number;
  cadence?: number;
  fractionalCadence?: number;
};

export type FitLap = {
  totalTimerTime?: number;
  totalDistance?: number;
  enhancedAvgSpeed?: number;
  avgHeartRate?: number;
  avgRunningCadence?: number;
  avgCadence?: number;
  avgFractionalCadence?: number;
};

/** Unzips Garmin's download and decodes the .FIT inside it (`docs/garmin-api.md`). */
export function decodeActivityZip(zip: Uint8Array) {
  const fit = Object.values(unzipSync(zip))[0];
  if (!fit) return null;
  const { messages } = new Decoder(Stream.fromByteArray(fit)).read({ convertDateTimesToDates: true });
  return {
    records: (messages.recordMesgs ?? []) as FitRecord[],
    laps: (messages.lapMesgs ?? []) as FitLap[],
    // Strength `set` messages, shaped by the strength module that reads them.
    sets: (messages.setMesgs ?? []) as unknown[],
  };
}

export type MetricKey = "hr" | "pace" | "speed" | "altitude" | "cadence";

export type Series = { key: MetricKey; points: { t: number; v: number }[] };

/** Charts a run always offers (R-ACT-05). The ones its file lacks are shown with the reason instead of left out. */
export const RUN_CHARTS: MetricKey[] = ["hr", "pace", "altitude", "cadence"];

/** The expected charts the file has no series for, in the expected order. */
export function missingCharts(series: Series[], expected: MetricKey[]): MetricKey[] {
  const present = new Set(series.map((s) => s.key));
  return expected.filter((key) => !present.has(key));
}

/** Below this speed you're standing, and a pace of "60:00 /km" would flatten the chart. */
const MIN_MOVING_SPEED = 0.5;
const MIN_COVERAGE = 0.1;

/** FIT stores cadence per foot, with a fractional part; steps per minute count both feet. */
const stepsPerMinute = (cadence?: number, fraction?: number) => (cadence ? (cadence + (fraction ?? 0)) * 2 : undefined);

/**
 * Series for every metric the file actually has, averaged into at most `maxPoints` buckets.
 * Distance sports measured in km/h (R-DAT-05) get speed instead of pace.
 */
export function chartSeries(records: FitRecord[], { speedAsPace, maxPoints = 300 }: { speedAsPace: boolean; maxPoints?: number }): Series[] {
  const timed = records.filter((record) => record.timestamp instanceof Date);
  if (timed.length < 2) return [];
  const start = timed[0].timestamp!.getTime();
  const end = timed[timed.length - 1].timestamp!.getTime();
  const span = Math.max(1, end - start);

  const pick: Record<MetricKey, (record: FitRecord) => number | undefined> = {
    hr: (record) => record.heartRate || undefined,
    pace: (record) => (speedAsPace && (record.enhancedSpeed ?? 0) >= MIN_MOVING_SPEED ? 1000 / 60 / record.enhancedSpeed! : undefined),
    speed: (record) => (!speedAsPace && (record.enhancedSpeed ?? 0) >= MIN_MOVING_SPEED ? record.enhancedSpeed! * 3.6 : undefined),
    altitude: (record) => record.enhancedAltitude,
    cadence: (record) => stepsPerMinute(record.cadence, record.fractionalCadence),
  };

  const series: Series[] = [];
  for (const key of Object.keys(pick) as MetricKey[]) {
    const buckets = Array.from({ length: Math.min(maxPoints, timed.length) }, () => ({ sum: 0, n: 0, t: 0 }));
    let present = 0;
    for (const record of timed) {
      const value = pick[key](record);
      if (value === undefined || !Number.isFinite(value)) continue;
      present++;
      const t = (record.timestamp!.getTime() - start) / 1000;
      const bucket = buckets[Math.min(buckets.length - 1, Math.floor(((t * 1000) / span) * buckets.length))];
      bucket.sum += value;
      bucket.n++;
      bucket.t += t;
    }
    if (present / timed.length < MIN_COVERAGE) continue;
    series.push({ key, points: buckets.filter((b) => b.n > 0).map((b) => ({ t: b.t / b.n, v: b.sum / b.n })) });
  }
  return series;
}

export type LapRow = { distance_m: number | null; time_s: number | null; speed: number | null; hr: number | null; cadence: number | null };

/** Laps as the watch split them. Running cadence comes per foot in FIT, so it's doubled into steps per minute. */
export function lapRows(laps: FitLap[]): LapRow[] {
  return laps.map((lap) => ({
    distance_m: lap.totalDistance ?? null,
    time_s: lap.totalTimerTime ?? null,
    speed: lap.enhancedAvgSpeed ?? null,
    hr: lap.avgHeartRate ?? null,
    cadence: stepsPerMinute(lap.avgRunningCadence ?? lap.avgCadence, lap.avgFractionalCadence) ?? null,
  }));
}
