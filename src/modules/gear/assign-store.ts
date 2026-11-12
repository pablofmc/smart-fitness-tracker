import "server-only";
import { readAll } from "@/lib/activities/store";
import { RUN_SPORTS } from "@/lib/load/running";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignRuns } from "./assign";

const BATCH = 500;

/** Derived step at the end of each sync run (ADR-0005): decides the shoe of every run not decided yet. */
export async function assignPendingRuns(userId: string) {
  const db = createAdminClient();
  const [runs, decided, { data: defaultShoe, error }] = await Promise.all([
    readAll((from, to) => db.from("activities").select("id, started_at").eq("user_id", userId).in("sport", RUN_SPORTS).order("id").range(from, to)),
    readAll((from, to) => db.from("shoe_runs").select("activity_id").eq("user_id", userId).order("activity_id").range(from, to)),
    db.from("shoes").select("id, created_at").eq("user_id", userId).eq("is_default", true).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);

  const rows = assignRuns(
    runs.map((r) => ({ id: r.id, startedAt: r.started_at })),
    new Set(decided.map((d) => d.activity_id)),
    defaultShoe ? { id: defaultShoe.id, createdAt: defaultShoe.created_at } : null,
  );
  for (let i = 0; i < rows.length; i += BATCH) {
    // A pick made by hand meanwhile wins: existing rows are never overwritten.
    const { error: saveError } = await db
      .from("shoe_runs")
      .upsert(rows.slice(i, i + BATCH).map((r) => ({ ...r, user_id: userId, source: "sync" })), { onConflict: "activity_id", ignoreDuplicates: true });
    if (saveError) throw new Error(`Saving shoe runs: ${saveError.message}`);
  }
  return { assigned: rows.filter((r) => r.shoe_id !== null).length, decided: rows.length };
}
