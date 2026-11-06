/** One logged set as the routine history reads it. */
export type HistorySet = { id: string; exercise: string; label: string; position: number; kg: number; reps: number };

export type ExerciseLine = { exercise: string; label: string; sets: number; reps: number; sameReps: number | null; minKg: number; maxKg: number; record: boolean };

/**
 * One session of a routine, exercise by exercise in the order trained: how many sets, the reps
 * (one number when every set had the same), and the weight range. `recordSetIds` marks the lines
 * that include a personal record (R-STR-03).
 */
export function sessionLines(sets: HistorySet[], recordSetIds: ReadonlySet<string>): ExerciseLine[] {
  const lines = new Map<string, ExerciseLine & { position: number; repsSeen: Set<number> }>();
  for (const s of sets) {
    const line = lines.get(s.exercise) ?? { exercise: s.exercise, label: s.label, position: s.position, sets: 0, reps: 0, sameReps: null, minKg: Infinity, maxKg: -Infinity, record: false, repsSeen: new Set<number>() };
    line.sets++;
    line.reps += s.reps;
    line.repsSeen.add(s.reps);
    line.minKg = Math.min(line.minKg, s.kg);
    line.maxKg = Math.max(line.maxKg, s.kg);
    line.record ||= recordSetIds.has(s.id);
    line.position = Math.min(line.position, s.position);
    lines.set(s.exercise, line);
  }
  return [...lines.values()]
    .sort((a, b) => a.position - b.position)
    .map((l) => ({ exercise: l.exercise, label: l.label, sets: l.sets, reps: l.reps, sameReps: l.repsSeen.size === 1 ? [...l.repsSeen][0] : null, minKg: l.minKg, maxKg: l.maxKg, record: l.record }));
}

const KG = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });

/** "4 × 8 · 60–62,5 kg", "3 series · 26 reps · 20 kg", "3 × 12 · sin peso". */
export function lineText(l: Pick<ExerciseLine, "sets" | "reps" | "sameReps" | "minKg" | "maxKg">) {
  const count = l.sameReps !== null ? `${l.sets} × ${l.sameReps}` : `${l.sets} series · ${l.reps} reps`;
  const kg = l.maxKg <= 0 ? "sin peso" : l.minKg === l.maxKg ? `${KG.format(l.minKg)} kg` : `${KG.format(l.minKg)}–${KG.format(l.maxKg)} kg`;
  return `${count} · ${kg}`;
}
