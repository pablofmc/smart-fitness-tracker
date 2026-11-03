import "server-only";
import { parsePendingActivities } from "@/lib/activities/store";
import { parsePendingHealth } from "@/lib/health/store";
import { createGarminClient, GarminBlockedError, GarminRequestError, GarminUnavailableError } from "@/lib/garmin/client";
import { markGarminKeyBlocked, readUsableGarminKey } from "@/lib/garmin/key";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSync } from "./run";
import { createSyncStore } from "./store";

/** Longer than Vercel Hobby's 300 s limit, so a "running" row this old can only be a killed run. */
const STALE_RUN_MS = 6 * 60_000;
/** Parsing shares the function's time limit with the Garmin budget, and resumes on the next run. */
const PARSE_BUDGET_MS = 30_000;

export type StartOutcome = "finished" | "failed" | "blocked" | "no-key" | "already-running";

function describe(error: unknown) {
  if (error instanceof GarminUnavailableError || error instanceof GarminRequestError) return error.message;
  return error instanceof Error ? error.name : "Unknown error";
}

/** Runs one logged sync. Callers must have checked the session or the shared secret first. */
export async function startSync(trigger: "scheduled" | "manual", budgetMs: number): Promise<StartOutcome> {
  const db = createAdminClient();

  const staleBefore = new Date(Date.now() - STALE_RUN_MS).toISOString();
  await db
    .from("sync_runs")
    .update({ status: "failed", finished_at: new Date().toISOString(), error: "Run interrupted" })
    .eq("status", "running")
    .lt("started_at", staleBefore);

  const { count } = await db.from("sync_runs").select("id", { count: "exact", head: true }).eq("status", "running");
  if (count) return "already-running";

  const apiKey = await readUsableGarminKey();
  if (!apiKey) return "no-key";

  const { data: run, error } = await db.from("sync_runs").insert({ trigger }).select("id").single();
  if (error) throw new Error("No pudimos registrar la sincronización.");

  const finish = (status: "succeeded" | "failed" | "blocked", items: number, message: string | null) =>
    db.from("sync_runs").update({ status, finished_at: new Date().toISOString(), items_fetched: items, error: message }).eq("id", run.id);

  try {
    const result = await runSync({
      garmin: createGarminClient({ apiKey }),
      store: createSyncStore(),
      today: new Date().toISOString().slice(0, 10),
      forceRecentHealth: trigger === "manual",
      budgetMs,
    });
    const failures = [...result.failures];
    const parseUntil = Date.now() + PARSE_BUDGET_MS;
    await parsePendingActivities(PARSE_BUDGET_MS).catch((caught) => failures.push(`Parsing activities: ${describe(caught)}`));
    await parsePendingHealth(Math.max(0, parseUntil - Date.now())).catch((caught) => failures.push(`Parsing health: ${describe(caught)}`));
    const failed = failures.length > 0;
    await finish(failed ? "failed" : "succeeded", result.itemsFetched, failed ? failures.join("; ").slice(0, 500) : null);
    return failed ? "failed" : "finished";
  } catch (caught) {
    if (caught instanceof GarminBlockedError) {
      await markGarminKeyBlocked();
      await finish("blocked", 0, describe(caught));
      return "blocked";
    }
    await finish("failed", 0, describe(caught));
    return "failed";
  }
}
