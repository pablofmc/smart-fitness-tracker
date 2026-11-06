import { beatsBest, epley } from "@/lib/metrics/strength";

/** Weight and reps of one set. */
export type Effort = { kg: number; reps: number };

export type SessionExercise = {
  /** Stable within the session: the routine position, or a random key for exercises added on the go. */
  key: string;
  name: string;
  category: string | null;
  /** The routine's target as text, e.g. "4 × 8-10 · 60 kg", or null. */
  target: string | null;
  targetKg: number | null;
  targetReps: string | null;
  /** The last set of this exercise from an earlier session, for the prefill. */
  last: (Effort & { day: string }) | null;
  /** Best weight and estimated 1RM before this session, to mark records while I train (R-STR-03). */
  best?: { kg: number; e1rm: number } | null;
};

export type LoggedSet = Effort & {
  id: string;
  exerciseKey: string;
  setNumber: number;
  loggedAt: string;
  /** False until the server confirmed it; such sets are "waiting" on the phone. */
  synced: boolean;
};

/** A session in progress, kept on the phone so it survives no signal and a closed tab. */
export type ActiveSession = {
  id: string;
  routineId: number | null;
  name: string;
  localDay: string;
  startedAt: string;
  endedAt: string | null;
  exercises: SessionExercise[];
  sets: LoggedSet[];
  /** False while the session row itself (name, end time) has changes the server hasn't confirmed. */
  headerSynced: boolean;
  /** Sets removed on the phone that the server may still have. */
  deletedSetIds: string[];
};

export const KG_STEP = 2.5;

/** The first number in a target like "8-10" or "12 c/lado"; null for "45 s" or nothing. */
export function targetRepsNumber(target: string | null): number | null {
  if (!target || /\d\s*s\b|seg|min/i.test(target)) return null;
  const n = Number(target.match(/\d+/)?.[0]);
  return Number.isInteger(n) && n >= 1 && n <= 200 ? n : null;
}

export const setsOf = (session: ActiveSession, exerciseKey: string) => session.sets.filter((s) => s.exerciseKey === exerciseKey);

/**
 * Weight and reps to offer for the next set (R-STR-08): the previous set of this session, else the last
 * time I did the exercise, else the routine's target, else an empty bar for 8.
 */
export function prefill(session: ActiveSession, exerciseKey: string): Effort {
  const done = setsOf(session, exerciseKey);
  if (done.length) return { kg: done[done.length - 1].kg, reps: done[done.length - 1].reps };
  const exercise = session.exercises.find((e) => e.key === exerciseKey);
  if (exercise?.last) return { kg: exercise.last.kg, reps: exercise.last.reps };
  return { kg: exercise?.targetKg ?? 0, reps: targetRepsNumber(exercise?.targetReps ?? null) ?? 8 };
}

/** Adds a set, numbered after the ones already logged for that exercise. */
export function addSet(session: ActiveSession, exerciseKey: string, effort: Effort, id: string, now: Date): ActiveSession {
  const set: LoggedSet = { id, exerciseKey, setNumber: setsOf(session, exerciseKey).length + 1, kg: effort.kg, reps: effort.reps, loggedAt: now.toISOString(), synced: false };
  return { ...session, sets: [...session.sets, set] };
}

/** Removes a set and renumbers the rest of that exercise. */
export function removeSet(session: ActiveSession, setId: string): ActiveSession {
  const gone = session.sets.find((s) => s.id === setId);
  if (!gone) return session;
  let n = 0;
  const sets = session.sets
    .filter((s) => s.id !== setId)
    .map((s) => (s.exerciseKey === gone.exerciseKey ? { ...s, setNumber: ++n, synced: s.setNumber === n ? s.synced : false } : s));
  return { ...session, sets, deletedSetIds: [...session.deletedSetIds, setId] };
}

export const pendingCount = (session: ActiveSession) => session.sets.filter((s) => !s.synced).length;
export const hasPending = (session: ActiveSession) => !session.headerSynced || session.deletedSetIds.length > 0 || pendingCount(session) > 0;

/** What the next upload sends: the session row, every set not confirmed yet, and the removals. */
export const uploadOf = (session: ActiveSession) => ({
  headerSent: !session.headerSynced,
  endedAt: session.endedAt,
  sets: session.sets.filter((s) => !s.synced),
  deletedSetIds: session.deletedSetIds,
});

/** After the server confirmed an upload: those sets are synced, unless they changed meanwhile. */
export function markSynced(session: ActiveSession, sent: { headerSent: boolean; endedAt?: string | null; sets: LoggedSet[]; deletedSetIds?: string[] }): ActiveSession {
  const confirmed = new Map(sent.sets.map((s) => [s.id, s]));
  const deleted = new Set(sent.deletedSetIds ?? []);
  return {
    ...session,
    // The session row counts as confirmed only if it didn't change (ended) while it was being sent.
    headerSynced: session.headerSynced || (sent.headerSent && (sent.endedAt === undefined || sent.endedAt === session.endedAt)),
    deletedSetIds: session.deletedSetIds.filter((id) => !deleted.has(id)),
    sets: session.sets.map((s) => {
      const was = confirmed.get(s.id);
      return was && was.setNumber === s.setNumber && was.kg === s.kg && was.reps === s.reps ? { ...s, synced: true } : s;
    }),
  };
}

/**
 * Sets of this session that are records: they beat the exercise's earlier bests and every earlier set of
 * this session. An exercise never logged before has no bests, so its first session only sets the baseline.
 */
export function recordSetIds(session: ActiveSession): Set<string> {
  const ids = new Set<string>();
  for (const exercise of session.exercises) {
    if (!exercise.best) continue;
    let best = { ...exercise.best };
    for (const set of [...setsOf(session, exercise.key)].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))) {
      if (beatsBest(set, best).length) ids.add(set.id);
      const e = epley(set.kg, set.reps);
      best = { kg: Math.max(best.kg, set.kg), e1rm: Math.max(best.e1rm, e.available ? e.value : 0) };
    }
  }
  return ids;
}
