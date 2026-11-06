/** A logged session as the matching rule sees it. Times are ISO strings. */
export type SessionForLink = {
  id: string;
  localDay: string;
  startedAt: string;
  endedAt: string | null;
  /** When the last set was logged; stands in for the end of a session never closed. */
  lastSetAt: string | null;
  activityId: number | null;
  linkSource: "sync" | "manual" | null;
};

/** A Garmin strength activity. */
export type ActivityForLink = { id: number; localDay: string; startedAt: string | null; durationS: number | null };

/**
 * The watch is often started a little before or stopped a little after logging the first and last set,
 * so windows touching within this margin count as overlapping.
 */
export const LINK_SLACK_MS = 10 * 60_000;

function sessionWindow(s: SessionForLink): [number, number] {
  const start = Date.parse(s.startedAt);
  const end = Math.max(start, Date.parse(s.endedAt ?? s.lastSetAt ?? s.startedAt));
  return [start, end];
}

/** Strength activities of the same day whose time overlaps the session (R-STR-09). */
export function candidatesFor(session: SessionForLink, activities: ActivityForLink[]): ActivityForLink[] {
  const [start, end] = sessionWindow(session);
  return activities.filter((a) => {
    if (a.localDay !== session.localDay || !a.startedAt) return false;
    const aStart = Date.parse(a.startedAt);
    const aEnd = aStart + (a.durationS ?? 0) * 1000;
    return aStart <= end + LINK_SLACK_MS && aEnd >= start - LINK_SLACK_MS;
  });
}

/**
 * Links each session nobody linked yet to its one overlapping activity. A session with two or more
 * candidates waits for me to pick; one I linked by hand, or the sync already linked, is left alone.
 */
export function linksToMake(sessions: SessionForLink[], activities: ActivityForLink[]) {
  return sessions.flatMap((s) => {
    if (s.linkSource !== null) return [];
    const found = candidatesFor(s, activities);
    return found.length === 1 ? [{ sessionId: s.id, activityId: found[0].id }] : [];
  });
}

/** One row of "what I logged" next to "what the watch saw" for the same exercise. */
export type CompareRow = { name: string; logged: { sets: number; reps: number; sameReps: number | null; minKg: number; maxKg: number } | null; watch: { sets: number; reps: number } | null; unclassified: boolean };

/**
 * Pairs logged exercises with the watch's by exercise key, keeping both sides as they are: nothing is
 * merged or corrected. Logged exercises typed by hand and watch sets it couldn't classify get rows of their own.
 */
export function compareRows(
  logged: { exerciseName: string; category: string | null; position: number; kg: number; reps: number }[],
  watch: { category: string; name: string; sets: number; reps: number }[],
): CompareRow[] {
  const groups = new Map<string, { name: string; position: number; category: string | null; sets: number; reps: number; repsSeen: Set<number>; minKg: number; maxKg: number }>();
  for (const s of logged) {
    const key = s.category ?? `name:${s.exerciseName.toLowerCase()}`;
    const g = groups.get(key) ?? { name: s.exerciseName, position: s.position, category: s.category, sets: 0, reps: 0, repsSeen: new Set<number>(), minKg: Infinity, maxKg: -Infinity };
    g.sets++;
    g.reps += s.reps;
    g.repsSeen.add(s.reps);
    g.minKg = Math.min(g.minKg, s.kg);
    g.maxKg = Math.max(g.maxKg, s.kg);
    groups.set(key, g);
  }
  const watchBy = new Map(watch.map((w) => [w.category, w]));
  const rows: CompareRow[] = [...groups.values()]
    .sort((a, b) => a.position - b.position)
    .map((g) => {
      const w = g.category ? watchBy.get(g.category) : undefined;
      if (w) watchBy.delete(w.category);
      return { name: g.name, logged: { sets: g.sets, reps: g.reps, sameReps: g.repsSeen.size === 1 ? [...g.repsSeen][0] : null, minKg: g.minKg, maxKg: g.maxKg }, watch: w ? { sets: w.sets, reps: w.reps } : null, unclassified: false };
    });
  for (const w of watchBy.values()) rows.push({ name: w.name, logged: null, watch: { sets: w.sets, reps: w.reps }, unclassified: w.category === "unknown" });
  return rows.sort((a, b) => Number(a.unclassified) - Number(b.unclassified));
}
