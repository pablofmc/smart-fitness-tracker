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

/** One set as a record: its weight, reps and when. */
export type BestSet = { kg: number; reps: number; day: string; at: string };

/** One exercise on the records board (R-STR-03). */
export type BoardRow = {
  exercise: string;
  group: string;
  /** The heaviest set; on a tie, the one with more reps, then the earlier one. */
  heaviest: BestSet;
  /** The set with the best estimated 1RM, or null when no set has 1–10 reps. */
  best1rm: (BestSet & { value: number }) | null;
  /** Days with at least one set with weight. */
  sessions: number;
  firstDay: string;
  /** The later of the two bests' days. */
  bestDay: string;
};

const chrono = (a: BestSet, b: BestSet) => a.day.localeCompare(b.day) || a.at.localeCompare(b.at);

/** The records board: each exercise with logged weight once, with its heaviest set and best estimated 1RM. */
export function recordBoard(sets: StrengthSet[]): BoardRow[] {
  const rows = new Map<string, BoardRow & { days: Set<string> }>();
  for (const s of [...sets].filter((x) => x.kg > 0).sort(chrono)) {
    const e = epley(s.kg, s.reps);
    const one = { kg: s.kg, reps: s.reps, day: s.day, at: s.at };
    const row = rows.get(s.exercise);
    if (!row) {
      rows.set(s.exercise, { exercise: s.exercise, group: s.group, heaviest: one, best1rm: e.available ? { ...one, value: e.value } : null, sessions: 0, firstDay: s.day, bestDay: s.day, days: new Set([s.day]) });
      continue;
    }
    row.days.add(s.day);
    if (s.kg > row.heaviest.kg || (s.kg === row.heaviest.kg && s.reps > row.heaviest.reps)) row.heaviest = one;
    if (e.available && e.value > (row.best1rm?.value ?? 0)) row.best1rm = { ...one, value: e.value };
  }
  return [...rows.values()].map(({ days, ...row }) => {
    const bestDay = row.best1rm && row.best1rm.day > row.heaviest.day ? row.best1rm.day : row.heaviest.day;
    return { ...row, sessions: days.size, bestDay };
  });
}

/** Per day of one exercise: the heaviest set and the best estimated 1RM (null when no set has 1–10 reps). */
export function sessionBests(sets: StrengthSet[], exercise: string): { day: string; kg: number; reps: number; e1rm: number | null }[] {
  const days = new Map<string, { kg: number; reps: number; e1rm: number | null }>();
  for (const s of sets) {
    if (s.exercise !== exercise || !(s.kg > 0)) continue;
    const e = epley(s.kg, s.reps);
    const d = days.get(s.day);
    if (!d) {
      days.set(s.day, { kg: s.kg, reps: s.reps, e1rm: e.available ? e.value : null });
      continue;
    }
    if (s.kg > d.kg || (s.kg === d.kg && s.reps > d.reps)) Object.assign(d, { kg: s.kg, reps: s.reps });
    if (e.available && e.value > (d.e1rm ?? 0)) d.e1rm = e.value;
  }
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, d]) => ({ day, ...d }));
}

/** The heaviest set with at least each number of reps; null when no set reached it. */
export function bestByReps(sets: StrengthSet[], exercise: string, targets: number[] = [1, 3, 5, 8, 10]): { reps: number; kg: number | null }[] {
  const mine = sets.filter((s) => s.exercise === exercise && s.kg > 0);
  return targets.map((reps) => {
    const ok = mine.filter((s) => s.reps >= reps).map((s) => s.kg);
    return { reps, kg: ok.length ? Math.max(...ok) : null };
  });
}

/** How the heaviest weight grew: the first set, then every set heavier than all before it, oldest first. */
export function weightProgression(sets: StrengthSet[], exercise: string): (BestSet & { delta: number | null })[] {
  const out: (BestSet & { delta: number | null })[] = [];
  for (const s of sets.filter((x) => x.exercise === exercise && x.kg > 0).sort(chrono)) {
    const prior = out.at(-1);
    if (!prior || s.kg > prior.kg) out.push({ kg: s.kg, reps: s.reps, day: s.day, at: s.at, delta: prior ? s.kg - prior.kg : null });
  }
  return out;
}

// Training-load calculator (#64): a percentage of a record, as weight on a bar. Values are in the unit
// shown (#66); the spec gives that unit's bar, rounding step and plates.
export type LoadSpec = { bar: number; step: number; plates: readonly number[] };
export const KG_LOAD: LoadSpec = { bar: 20, step: 2.5, plates: [25, 20, 15, 10, 5, 2.5, 1.25] };

/** pct % of base, rounded to the nearest step (2.5 kg: the smallest jump with 1.25 kg plates), never below the bar. */
export function percentLoad(base: number, pct: number, spec: LoadSpec = KG_LOAD): { exact: number; target: number } {
  const exact = (base * pct) / 100;
  return { exact: round1(exact), target: Math.max(spec.bar, Math.round(exact / spec.step) * spec.step) };
}

/** Plates on each side of the bar for a total weight, heaviest first. Whatever doesn't fit the smallest plate is left off. */
export function platesPerSide(total: number, spec: LoadSpec = KG_LOAD): number[] {
  let side = (total - spec.bar) / 2;
  const out: number[] = [];
  for (const p of spec.plates) {
    while (side >= p - 1e-9) {
      out.push(p);
      side -= p;
    }
  }
  return out;
}

/** Epley backwards: the reps you could do at kg with this estimated 1RM, 30 × (1RM / kg − 1), at least 1. */
export function repsAt(kg: number, e1rm: number): number {
  if (kg >= e1rm) return 1;
  return Math.max(1, Math.floor(30 * (e1rm / kg - 1) + 1e-9));
}
