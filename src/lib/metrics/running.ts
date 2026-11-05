import type { Unavailable } from "./hr";

export const RUNNING_FORMULA_VERSION = 1;

/** Seconds since start, metres covered, m/s, bpm; GPS says whether the sample has a position. */
export type RunSample = { t: number; distance?: number; speed?: number; hr?: number; gps?: boolean };
export type RunLap = { distance: number; seconds: number };

export const BEST_EFFORT_METRES = [1000, 5000, 10000, 21097.5] as const;

/**
 * Shortest elapsed time covering `metres` anywhere in the run, interpolating where the window ends.
 * Pauses inside the window count as time (R-RUN-04).
 */
export function bestEffort(samples: RunSample[], metres: number): number | null {
  const points = samples.filter((s) => s.distance !== undefined).sort((a, b) => a.t - b.t) as (RunSample & { distance: number })[];
  let best: number | null = null;
  let j = 0;
  for (let i = 0; i < points.length; i++) {
    if (j < i) j = i;
    while (j < points.length && points[j].distance - points[i].distance < metres) j++;
    if (j >= points.length) break;
    const before = points[j - 1];
    const after = points[j];
    const span = after.distance - before.distance;
    const end = span > 0 ? before.t + ((metres - (before.distance - points[i].distance)) / span) * (after.t - before.t) : after.t;
    const time = end - points[i].t;
    if (best === null || time < best) best = time;
  }
  return best;
}

/** A run counts for records only outdoors with GPS: treadmill distance comes from the wrist (R-RUN-04). */
export function countsForRecords(sport: string, samples: RunSample[]) {
  return sport !== "treadmill_running" && sport !== "indoor_running" && samples.some((s) => s.gps);
}

export type Drift = { available: true; percent: number; good: boolean; inputs: { ef1: number; ef2: number; minutes: number } } | Unavailable;

const MIN_DRIFT_MINUTES = 60;
const STEADY_TOLERANCE = 0.1;

/** Laps shorter than 90 % of the median are partial (usually the last), and don't decide steadiness. */
function fullLaps(laps: RunLap[]) {
  const sorted = laps.map((l) => l.distance).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  return laps.filter((l) => l.distance >= median * 0.9 && l.seconds > 0);
}

/** Pa:HR decoupling between the two halves of a long steady run (R-RUN-03). Below 5 % is good. */
export function cardiacDrift(samples: RunSample[], laps: RunLap[]): Drift {
  const timed = samples.filter((s) => s.speed !== undefined && s.hr).sort((a, b) => a.t - b.t);
  if (timed.length < 2) return { available: false, reason: "Sin datos de ritmo y FC" };
  const minutes = (timed[timed.length - 1].t - timed[0].t) / 60;
  if (minutes < MIN_DRIFT_MINUTES) return { available: false, reason: "Solo en carreras de 60 min o más" };

  const full = fullLaps(laps);
  if (full.length >= 2) {
    const paces = full.map((l) => l.seconds / l.distance);
    const mean = paces.reduce((s, p) => s + p, 0) / paces.length;
    if (paces.some((p) => Math.abs(p - mean) / mean > STEADY_TOLERANCE)) return { available: false, reason: "Solo en carreras de ritmo constante" };
  }

  const middle = timed[0].t + (timed[timed.length - 1].t - timed[0].t) / 2;
  const ef = (half: RunSample[]) => {
    const speed = half.reduce((s, x) => s + x.speed!, 0) / half.length;
    const hr = half.reduce((s, x) => s + x.hr!, 0) / half.length;
    return speed / hr;
  };
  const ef1 = ef(timed.filter((s) => s.t < middle));
  const ef2 = ef(timed.filter((s) => s.t >= middle));
  const percent = ((ef1 - ef2) / ef1) * 100;
  return { available: true, percent, good: percent < 5, inputs: { ef1, ef2, minutes } };
}

export type PaceAtHr = { available: true; secondsPerKm: number; qualifyingMinutes: number; targetHr: number } | Unavailable;

const SKIP_SECONDS = 600;
const HR_WINDOW = 3;
const MIN_QUALIFYING_MINUTES = 5;

/** Default target HR: the middle of Z2, 87 % of LTHR, rounded (fitness-metrics skill). */
export const defaultTargetHr = (lthr: number) => Math.round(lthr * 0.87);

/** Mean pace of the samples within ±3 bpm of the target, after the first 10 minutes (R-RUN-02). */
export function paceAtHr(samples: RunSample[], targetHr: number): PaceAtHr {
  if (!samples.some((s) => s.gps)) return { available: false, reason: "Sin GPS" };
  const sorted = [...samples].sort((a, b) => a.t - b.t);
  const start = sorted[0]?.t ?? 0;
  let seconds = 0;
  let metres = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i];
    const dt = sorted[i + 1].t - s.t;
    if (s.t - start < SKIP_SECONDS || !s.hr || !s.speed || dt <= 0 || dt > 30) continue;
    if (Math.abs(s.hr - targetHr) > HR_WINDOW) continue;
    seconds += dt;
    metres += s.speed * dt;
  }
  if (seconds / 60 < MIN_QUALIFYING_MINUTES || metres <= 0) return { available: false, reason: "Menos de 5 min cerca de la FC objetivo" };
  return { available: true, secondsPerKm: seconds / (metres / 1000), qualifyingMinutes: seconds / 60, targetHr };
}

/** Median of the values, for the weekly trend of pace at fixed HR. */
export function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
