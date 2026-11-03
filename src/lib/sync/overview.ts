import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITIES_STREAM } from "./run";
import { historyFraction, RANGE_STREAMS } from "./streams";

export type SyncOverview = {
  lastSuccessAt: string | null;
  lastFailed: boolean;
  activityCount: number;
  history: { complete: boolean; percent: number; reachedDay: string | null };
};

/** Reads through the signed-in session, so RLS applies. */
export async function getSyncOverview(): Promise<SyncOverview> {
  const db = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: latest }, { data: lastSuccess }, { data: cursors }, { count }] = await Promise.all([
    db.from("sync_runs").select("status").neq("status", "running").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("sync_runs").select("finished_at").eq("status", "succeeded").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("sync_cursors").select("stream, position, backfill_completed_at"),
    db.from("raw_files").select("id", { count: "exact", head: true }).eq("kind", "activity_summary"),
  ]);

  const byStream = new Map((cursors ?? []).map((cursor) => [cursor.stream, cursor]));
  const activities = byStream.get(ACTIVITIES_STREAM);
  const oldest: string | null = activities?.position ? (JSON.parse(activities.position).oldest ?? null) : null;

  // Activities page from today backwards, so their share is the days already covered.
  const fractions = [
    activities?.backfill_completed_at ? 1 : oldest ? 1 - historyFraction(oldest, today) : 0,
    ...RANGE_STREAMS.map(({ name }) => {
      const cursor = byStream.get(name);
      return cursor?.backfill_completed_at ? 1 : historyFraction(cursor?.position ?? null, today);
    }),
  ];
  const complete = fractions.every((fraction) => fraction === 1);

  return {
    lastSuccessAt: lastSuccess?.finished_at ?? null,
    lastFailed: latest?.status === "failed",
    activityCount: count ?? 0,
    history: {
      complete,
      percent: complete ? 100 : Math.min(99, Math.floor((fractions.reduce((sum, f) => sum + f, 0) / fractions.length) * 100)),
      reachedDay: activities?.backfill_completed_at ? null : oldest,
    },
  };
}
