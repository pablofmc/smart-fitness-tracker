import { mondayOf } from "@/lib/load/weekly";
import { addDays } from "@/lib/sync/streams";

/** One `set` message from a strength .FIT. Every field may be missing (`docs/garmin-api.md`). */
export type FitSet = {
  setType?: string;
  duration?: number;
  repetitions?: number;
  /** Up to three candidate exercises; Garmin's summary uses the first. */
  category?: (string | null)[] | null;
};

export const MUSCLE_GROUPS = ["Piernas", "Empuje", "Tirón", "Core", "Cuerpo completo"] as const;
export const UNCLASSIFIED = "Sin clasificar";
export type GroupName = (typeof MUSCLE_GROUPS)[number] | typeof UNCLASSIFIED;

/** Bumped when the grouping or the totals change, so every session is rebuilt from the raw .FIT. */
export const STRENGTH_FORMULA_VERSION = 1;

/** FIT exercise category → muscle group. Anything not listed (cardio, warm-up, machines) is "sin clasificar". */
const GROUP_OF: Record<string, (typeof MUSCLE_GROUPS)[number]> = {
  squat: "Piernas",
  lunge: "Piernas",
  deadlift: "Piernas",
  legCurl: "Piernas",
  calfRaise: "Piernas",
  hipRaise: "Piernas",
  hipStability: "Piernas",
  plyo: "Piernas",
  benchPress: "Empuje",
  pushUp: "Empuje",
  shoulderPress: "Empuje",
  flye: "Empuje",
  tricepsExtension: "Empuje",
  lateralRaise: "Empuje",
  pullUp: "Tirón",
  row: "Tirón",
  curl: "Tirón",
  shrug: "Tirón",
  shoulderStability: "Tirón",
  core: "Core",
  crunch: "Core",
  sitUp: "Core",
  plank: "Core",
  legRaise: "Core",
  chop: "Core",
  hyperextension: "Core",
  totalBody: "Cuerpo completo",
  olympicLift: "Cuerpo completo",
  hipSwing: "Cuerpo completo",
  carry: "Cuerpo completo",
  sandbag: "Cuerpo completo",
  battleRope: "Cuerpo completo",
  sledgeHammer: "Cuerpo completo",
  tire: "Cuerpo completo",
  sled: "Cuerpo completo",
};

export const EXERCISE_NAMES: Record<string, string> = {
  benchPress: "Press de banca",
  calfRaise: "Elevación de talones",
  cardio: "Cardio",
  carry: "Acarreo",
  chop: "Leñador",
  core: "Core",
  crunch: "Abdominales",
  curl: "Curl",
  deadlift: "Peso muerto",
  flye: "Aperturas",
  hipRaise: "Puente de cadera",
  hipStability: "Estabilidad de cadera",
  hipSwing: "Swing",
  hyperextension: "Hiperextensión",
  lateralRaise: "Elevación lateral",
  legCurl: "Curl femoral",
  legRaise: "Elevación de piernas",
  lunge: "Zancada",
  olympicLift: "Levantamiento olímpico",
  plank: "Plancha",
  plyo: "Pliometría",
  pullUp: "Dominadas",
  pushUp: "Flexiones",
  row: "Remo",
  shoulderPress: "Press de hombro",
  shoulderStability: "Estabilidad de hombro",
  shrug: "Encogimientos",
  sitUp: "Sit-ups",
  squat: "Sentadilla",
  totalBody: "Cuerpo completo",
  tricepsExtension: "Extensión de tríceps",
  warmUp: "Calentamiento",
  bandedExercises: "Con banda",
  battleRope: "Cuerdas",
  sandbag: "Saco",
  sled: "Trineo",
  sledgeHammer: "Mazo",
  tire: "Neumático",
  suspension: "Suspensión",
};

export const groupOf = (category: string): GroupName => GROUP_OF[category] ?? UNCLASSIFIED;
export const exerciseName = (category: string) => (category === "unknown" ? UNCLASSIFIED : (EXERCISE_NAMES[category] ?? "Otro ejercicio"));

export type ExerciseTotal = { category: string; sets: number; reps: number; seconds: number };

export type StrengthSummary = {
  totalSets: number;
  totalReps: number;
  activeSeconds: number;
  unknownSets: number;
  exercises: ExerciseTotal[];
  groupSets: Partial<Record<GroupName, number>>;
};

/**
 * Totals per exercise and per muscle group over the active sets (R-STR-06). Rest sets are left out.
 * A set whose first candidate is missing or "unknown" counts as "sin clasificar".
 */
export function summarizeSets(sets: FitSet[]): StrengthSummary {
  const byCategory = new Map<string, ExerciseTotal>();
  const groupSets: Partial<Record<GroupName, number>> = {};
  let totalReps = 0;
  let activeSeconds = 0;
  let unknownSets = 0;
  const active = sets.filter((set) => set.setType === "active");

  for (const set of active) {
    const category = set.category?.[0] ?? "unknown";
    const reps = set.repetitions && set.repetitions > 0 ? set.repetitions : 0;
    const seconds = set.duration && set.duration > 0 ? set.duration : 0;
    const total = byCategory.get(category) ?? { category, sets: 0, reps: 0, seconds: 0 };
    total.sets++;
    total.reps += reps;
    total.seconds += seconds;
    byCategory.set(category, total);

    const group = groupOf(category);
    groupSets[group] = (groupSets[group] ?? 0) + 1;
    if (group === UNCLASSIFIED) unknownSets++;
    totalReps += reps;
    activeSeconds += seconds;
  }

  return {
    totalSets: active.length,
    totalReps,
    activeSeconds,
    unknownSets,
    // Most sets first; "sin clasificar" always last, as the design shows it.
    exercises: [...byCategory.values()].sort((a, b) => Number(a.category === "unknown") - Number(b.category === "unknown") || b.sets - a.sets),
    groupSets,
  };
}

/** Groups in display order: the five named ones, then "sin clasificar". */
export const GROUP_ORDER: GroupName[] = [...MUSCLE_GROUPS, UNCLASSIFIED];

/**
 * How many sessions trained each group in the 7 days ending on `day` (R-STR-04). A session counts once per group.
 * "Sin clasificar" is left out: it says nothing about which muscles were trained.
 */
export function weeklyFrequency(sessions: { day: string; groupSets: Partial<Record<GroupName, number>> }[], day: string) {
  const start = addDays(day, -6);
  const counts: Partial<Record<GroupName, number>> = {};
  for (const session of sessions) {
    if (session.day < start || session.day > day) continue;
    for (const group of MUSCLE_GROUPS) if ((session.groupSets[group] ?? 0) > 0) counts[group] = (counts[group] ?? 0) + 1;
  }
  return MUSCLE_GROUPS.filter((g) => counts[g]).map((group) => ({ group, sessions: counts[group]! }));
}

export type WeekSets = { monday: string; sets: Partial<Record<GroupName, number>>; sessions: Partial<Record<GroupName, number>> };

/**
 * Sets and sessions per group for each Monday week from `from` to `to` (R-STR-04), for the Tendencias card.
 * Weeks without strength stay in the list with nothing in them.
 */
export function weeklySets(rows: { day: string; groupSets: Partial<Record<GroupName, number>> }[], from: string, to: string) {
  const weeks: WeekSets[] = [];
  for (let monday = mondayOf(from); monday <= to; monday = addDays(monday, 7)) {
    weeks.push({ monday, sets: {}, sessions: {} });
  }
  const byMonday = new Map(weeks.map((w) => [w.monday, w]));
  for (const row of rows) {
    const week = byMonday.get(mondayOf(row.day));
    if (!week) continue;
    for (const [group, sets] of Object.entries(row.groupSets) as [GroupName, number][]) {
      if (!sets) continue;
      week.sets[group] = (week.sets[group] ?? 0) + sets;
      week.sessions[group] = (week.sessions[group] ?? 0) + 1;
    }
  }
  return weeks;
}
