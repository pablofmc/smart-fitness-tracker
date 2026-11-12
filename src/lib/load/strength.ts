import "server-only";
import { decodeActivityZip } from "@/lib/activities/fit";
import { fitPaths, readAll } from "@/lib/activities/store";
import { sportsInGroup } from "@/lib/activities/list";
import { createAdminClient } from "@/lib/supabase/admin";
import { STRENGTH_FORMULA_VERSION, summarizeSets, type FitSet } from "@/modules/strength/sets";

/** The strength module's totals for sessions that have none or are out of date. Same budget contract as the loads. */
export async function computePendingStrength(userId: string, budgetMs: number) {
  const db = createAdminClient();
  const deadline = Date.now() + budgetMs;
  const [sessions, done, fits] = await Promise.all([
    readAll((from, to) => db.from("activities").select("id").eq("user_id", userId).in("sport", sportsInGroup("strength_training")).order("id").range(from, to)),
    readAll((from, to) => db.from("strength_sessions").select("activity_id, formula_version").eq("user_id", userId).order("activity_id").range(from, to)),
    fitPaths(db, userId),
  ]);
  const current = new Map(done.map((d) => [d.activity_id, d.formula_version]));
  const pending = sessions.filter((s) => current.get(s.id) !== STRENGTH_FORMULA_VERSION);

  let count = 0;
  for (const session of pending) {
    if (Date.now() >= deadline) break;
    const fit = fits.get(session.id);
    const { data } = fit ? await db.storage.from("raw").download(fit) : { data: null };
    let sets: FitSet[] = [];
    if (data) {
      try {
        sets = (decodeActivityZip(new Uint8Array(await data.arrayBuffer()))?.sets ?? []) as FitSet[];
      } catch {
        sets = [];
      }
    }
    const summary = summarizeSets(sets);
    const { error } = await db.from("strength_sessions").upsert({
      user_id: userId,
      activity_id: session.id,
      formula_version: STRENGTH_FORMULA_VERSION,
      total_sets: summary.totalSets,
      total_reps: summary.totalReps,
      active_s: summary.activeSeconds,
      unknown_sets: summary.unknownSets,
      exercises: summary.exercises,
      group_sets: summary.groupSets,
      computed_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Saving strength sessions: ${error.message}`);
    count++;
  }
  return { done: count, pending: pending.length - count };
}
