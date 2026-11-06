/**
 * Strength numbers from the sets I log (R-STR-01, R-STR-02, R-STR-03), never from the watch, which has no
 * weights. Rules in the fitness-metrics skill. Pure: no React, no Supabase.
 */

/** One logged set. `day` is the session's local day ("YYYY-MM-DD"); `at` orders sets within a day. */
export type StrengthSet = { exercise: string; group: string; day: string; at: string; kg: number; reps: number };

export type Estimate = { available: true; value: number; inputs: string } | { available: false; reason: string };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Epley: weight × (1 + reps / 30), for weight > 0 and 1–10 reps; a 1-rep set gives its own weight. */
export function epley(kg: number, reps: number): Estimate {
  if (!(kg > 0)) return { available: false, reason: "Sin peso" };
  if (!Number.isInteger(reps) || reps < 1) return { available: false, reason: "Sin repeticiones" };
  if (reps > 10) return { available: false, reason: "Más de 10 repeticiones" };
  if (reps === 1) return { available: true, value: kg, inputs: `${kg} kg × 1` };
  return { available: true, value: round1(kg * (1 + reps / 30)), inputs: `${kg} kg × ${reps}: ${kg} × (1 + ${reps}/30)` };
}

/** Volume of one set: kg × reps. A set without weight adds nothing. */
export const setVolume = (s: Pick<StrengthSet, "kg" | "reps">) => Math.max(0, s.kg) * s.reps;

/** Volume per key (exercise, group…). Keys with no sets are absent, never zero. */
export function volumeBy(sets: StrengthSet[], key: (s: StrengthSet) => string): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of sets) out.set(key(s), (out.get(key(s)) ?? 0) + setVolume(s));
  return out;
}

function mondayOf(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/**
 * Volume per week (Monday) and muscle group. A week with no logged sets is not in the result, so the
 * chart shows it as "sin datos", not as zero (R-STR-01).
 */
export function weeklyVolume(sets: StrengthSet[]): { monday: string; byGroup: Record<string, number>; total: number }[] {
  const weeks = new Map<string, Record<string, number>>();
  for (const s of sets) {
    const w = weeks.get(mondayOf(s.day)) ?? {};
    w[s.group] = (w[s.group] ?? 0) + setVolume(s);
    weeks.set(mondayOf(s.day), w);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monday, byGroup]) => ({ monday, byGroup, total: Object.values(byGroup).reduce((a, b) => a + b, 0) }));
}

/** The day's estimated 1RM of one exercise: the one from its best set (R-STR-02). Days without a usable set are absent. */
export function dailyBest1RM(sets: StrengthSet[], exercise: string): { day: string; value: number; inputs: string }[] {
  const best = new Map<string, { value: number; inputs: string }>();
  for (const s of sets) {
    if (s.exercise !== exercise) continue;
    const e = epley(s.kg, s.reps);
    if (e.available && e.value > (best.get(s.day)?.value ?? 0)) best.set(s.day, { value: e.value, inputs: e.inputs });
  }
  return [...best.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, b]) => ({ day, ...b }));
}

export type RecordKind = "weight" | "1rm";
export type StrengthRecord = { exercise: string; day: string; at: string; kg: number; reps: number; kinds: RecordKind[]; e1rm: number | null };

/**
 * Personal records (R-STR-03): a set is a record when its weight, or its estimated 1RM, beats every
 * earlier set of that exercise. The first set ever logged of an exercise only sets the baseline.
 */
export function strengthRecords(sets: StrengthSet[]): StrengthRecord[] {
  const ordered = [...sets].sort((a, b) => a.day.localeCompare(b.day) || a.at.localeCompare(b.at));
  const best = new Map<string, { kg: number; e1rm: number }>();
  const out: StrengthRecord[] = [];
  for (const s of ordered) {
    const e = epley(s.kg, s.reps);
    const e1rm = e.available ? e.value : null;
    const prior = best.get(s.exercise);
    if (prior) {
      const kinds: RecordKind[] = [];
      if (s.kg > 0 && s.kg > prior.kg) kinds.push("weight");
      if (e1rm !== null && e1rm > prior.e1rm) kinds.push("1rm");
      if (kinds.length) out.push({ exercise: s.exercise, day: s.day, at: s.at, kg: s.kg, reps: s.reps, kinds, e1rm });
    }
    best.set(s.exercise, { kg: Math.max(prior?.kg ?? 0, s.kg), e1rm: Math.max(prior?.e1rm ?? 0, e1rm ?? 0) });
  }
  return out;
}

/** Whether a new set beats the earlier bests of its exercise (for marking it while I train). */
export function beatsBest(set: Pick<StrengthSet, "kg" | "reps">, prior: { kg: number; e1rm: number } | null): RecordKind[] {
  if (!prior) return [];
  const e = epley(set.kg, set.reps);
  const kinds: RecordKind[] = [];
  if (set.kg > 0 && set.kg > prior.kg) kinds.push("weight");
  if (e.available && e.value > prior.e1rm) kinds.push("1rm");
  return kinds;
}
