import "server-only";
import { sportsInGroup } from "@/lib/activities/list";
import { createAdminClient } from "@/lib/supabase/admin";
import { linksToMake } from "./link";

type Db = ReturnType<typeof createAdminClient>;

/** Latest set time per session, for sessions never closed. */
export async function lastSetTimes(db: Db, userId: string, sessionIds: string[]) {
  if (sessionIds.length === 0) return new Map<string, string>();
  const { data, error } = await db.from("logged_sets").select("session_id, logged_at").eq("user_id", userId).in("session_id", sessionIds);
  if (error) throw new Error(error.message);
  const last = new Map<string, string>();
  for (const s of data ?? []) if (!last.has(s.session_id) || s.logged_at > last.get(s.session_id)!) last.set(s.session_id, s.logged_at);
  return last;
}

/**
 * Derived step at the end of each sync run (ADR-0005, R-STR-09): links every logged session nobody
 * linked yet to its one overlapping Garmin strength activity. Sessions with two candidates stay for
 * me to pick in the activity detail.
 */
export async function linkPendingSessions(userId: string) {
  const db = createAdminClient();
  const { data: sessions, error } = await db
    .from("logged_sessions")
    .select("id, local_day, started_at, ended_at, activity_id, link_source")
    .eq("user_id", userId)
    .is("link_source", null);
  if (error) throw new Error(error.message);
  if (!sessions?.length) return { linked: 0 };

  const days = [...new Set(sessions.map((s) => s.local_day))];
  const [last, { data: activities, error: activityError }] = await Promise.all([
    lastSetTimes(db, userId, sessions.map((s) => s.id)),
    db.from("activities").select("id, local_day, started_at, duration_s").eq("user_id", userId).in("sport", sportsInGroup("strength_training")).in("local_day", days),
  ]);
  if (activityError) throw new Error(activityError.message);

  const links = linksToMake(
    sessions.map((s) => ({ id: s.id, localDay: s.local_day, startedAt: s.started_at, endedAt: s.ended_at, lastSetAt: last.get(s.id) ?? null, activityId: s.activity_id, linkSource: s.link_source as "sync" | "manual" | null })),
    (activities ?? []).map((a) => ({ id: a.id, localDay: a.local_day, startedAt: a.started_at, durationS: a.duration_s })),
  );
  for (const link of links) {
    // Only if still unlinked: a pick made meanwhile wins.
    const { error: saveError } = await db.from("logged_sessions").update({ activity_id: link.activityId, link_source: "sync" }).eq("user_id", userId).eq("id", link.sessionId).is("link_source", null);
    if (saveError) throw new Error(`Linking sessions: ${saveError.message}`);
  }
  return { linked: links.length };
}

