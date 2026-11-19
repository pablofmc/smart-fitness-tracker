import { baseline, type Baseline, type DayValue } from "./baseline";

export const READINESS_FORMULA_VERSION = 1;
export const READINESS_WEIGHTS = { hrv: 0.4, sleep: 0.35, form: 0.25 } as const;

export type ReadinessBand = "baja" | "media" | "buena" | "muy buena";

export type ReadinessPart = { score: number; z: number | null };

export type Readiness =
  | { available: true; score: number; band: ReadinessBand; hrv: ReadinessPart; sleep: ReadinessPart; form: ReadinessPart & { tsb: number } }
  | { available: false; reason: "sin línea base de HRV" | "sin sueño de anoche" | "sin línea base de sueño" | "sin carga calculada" };

const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

/** A value against its personal baseline: 50 at your mean, 75 at the top of your normal range. */
export function baselinePart(b: Extract<Baseline, { available: true }>): ReadinessPart {
  const sd = b.high - b.mean;
  const z = sd === 0 ? 0 : (b.value - b.mean) / sd;
  return { score: clamp(50 + 25 * z), z };
}

export function formPart(tsb: number): ReadinessPart {
  return { score: clamp(70 + 2 * tsb), z: null };
}

export function bandOf(score: number): ReadinessBand {
  return score < 40 ? "baja" : score < 60 ? "media" : score < 80 ? "buena" : "muy buena";
}

/**
 * Our readiness score (R-LOAD-06, fitness-metrics skill): 40 % HRV, 35 % sleep and 25 % form, each
 * from 0 to 100. Any missing input means no score, never a guess.
 */
export function readiness({ hrv, sleep, tsb, sleptLastNight }: { hrv: Baseline; sleep: Baseline; tsb: number | null; sleptLastNight: boolean }): Readiness {
  if (!hrv.available) return { available: false, reason: "sin línea base de HRV" };
  if (!sleptLastNight) return { available: false, reason: "sin sueño de anoche" };
  if (!sleep.available) return { available: false, reason: "sin línea base de sueño" };
  if (tsb === null) return { available: false, reason: "sin carga calculada" };
  const h = baselinePart(hrv);
  const s = baselinePart(sleep);
  const f = formPart(tsb);
  const score = Math.round(READINESS_WEIGHTS.hrv * h.score + READINESS_WEIGHTS.sleep * s.score + READINESS_WEIGHTS.form * f.score);
  return { available: true, score, band: bandOf(score), hrv: h, sleep: s, form: { ...f, tsb } };
}

/** Readiness on one day, from the HRV and sleep series and the form curve, with the inputs it read. */
export function readinessOn(day: string, { hrv, sleep, curve }: { hrv: DayValue[]; sleep: DayValue[]; curve: { day: string; tsb: number }[] }) {
  const hrvB = baseline(hrv, day, { recent: 7 });
  const sleepB = baseline(sleep, day, { recent: 1 });
  const tsb = curve.find((c) => c.day === day)?.tsb ?? null;
  const sleptLastNight = sleep.some((d) => d.day === day);
  return { readiness: readiness({ hrv: hrvB, sleep: sleepB, tsb, sleptLastNight }), hrv: hrvB, sleep: sleepB, tsb };
}
