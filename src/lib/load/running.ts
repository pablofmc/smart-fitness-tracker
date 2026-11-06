import "server-only";
import { decodeActivityZip, type FitRecord } from "@/lib/activities/fit";
import { readAll } from "@/lib/activities/store";
import { settingsFor } from "@/lib/metrics/hr";
import { bestEffort, BEST_EFFORT_METRES, cardiacDrift, countsForRecords, defaultTargetHr, paceAtHr, RUNNING_FORMULA_VERSION, type RunSample } from "@/lib/metrics/running";
import { createAdminClient } from "@/lib/supabase/admin";
import { readHrSettings } from "./store";

export const RUN_SPORTS = ["running", "treadmill_running", "trail_running", "track_running", "indoor_running"];

type Record = FitRecord & { distance?: number; positionLat?: number };

export function runSamples(records: Record[]): RunSample[] {
  const timed = records.filter((r) => r.timestamp instanceof Date);
  if (timed.length === 0) return [];
  const start = timed[0].timestamp!.getTime();
  return timed.map((r) => ({
    t: (r.timestamp!.getTime() - start) / 1000,
    distance: r.distance,
    speed: r.enhancedSpeed,
    hr: r.heartRate,
    gps: r.positionLat !== undefined,
  }));
}

/** The running module's values for runs that have none or are out of date. Same budget contract as the loads. */
export async function computePendingRunMetrics(budgetMs: number) {
  const db = createAdminClient();
  const deadline = Date.now() + budgetMs;
  const [versions, runs, done] = await Promise.all([
    readHrSettings(db),
    readAll((from, to) => db.from("activities").select("id, sport, local_day, data->averageRunningCadenceInStepsPerMinute").in("sport", RUN_SPORTS).order("id").range(from, to)),
    readAll((from, to) => db.from("run_metrics").select("activity_id, hr_settings_id, formula_version").order("activity_id").range(from, to)),
  ]);
  const current = new Map(done.map((d) => [d.activity_id, d]));
  const pending = runs.filter((r) => {
    const row = current.get(r.id);
    return !row || row.formula_version !== RUNNING_FORMULA_VERSION || row.hr_settings_id !== (settingsFor(r.local_day, versions)?.id ?? null);
  });

  let count = 0;
  for (const run of pending) {
    if (Date.now() >= deadline) break;
    const settings = settingsFor(run.local_day, versions);
    const { data } = await db.storage.from("raw").download(`activity_fit/${run.id}.zip`);
    let samples: RunSample[] = [];
    let laps: { distance: number; seconds: number }[] = [];
    if (data) {
      try {
        const decoded = decodeActivityZip(new Uint8Array(await data.arrayBuffer()));
        samples = runSamples((decoded?.records ?? []) as Record[]);
        laps = (decoded?.laps ?? []).map((l) => ({ distance: l.totalDistance ?? 0, seconds: l.totalTimerTime ?? 0 }));
      } catch {
        samples = [];
      }
    }
    const records = countsForRecords(run.sport, samples);
    const [b1, b5, b10, b21] = BEST_EFFORT_METRES.map((m) => (records ? bestEffort(samples, m) : null));
    const drift = cardiacDrift(samples, laps);
    const target = settings ? defaultTargetHr(settings.lthr) : null;
    const pace = target ? paceAtHr(samples, target) : null;
    const cadence = typeof run.averageRunningCadenceInStepsPerMinute === "number" ? run.averageRunningCadenceInStepsPerMinute : null;

    const { error } = await db.from("run_metrics").upsert({
      activity_id: run.id,
      hr_settings_id: settings?.id ?? null,
      formula_version: RUNNING_FORMULA_VERSION,
      counts_for_records: records,
      best_1k_s: b1,
      best_5k_s: b5,
      best_10k_s: b10,
      best_21k_s: b21,
      drift_pct: drift.available ? drift.percent : null,
      drift_reason: drift.available ? null : drift.reason,
      target_hr: target,
      pace_at_hr_s_per_km: pace?.available ? pace.secondsPerKm : null,
      pace_at_hr_reason: pace ? (pace.available ? null : pace.reason) : "Sin umbrales de FC para esa fecha",
      cadence_spm: cadence,
      computed_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Saving run metrics: ${error.message}`);
    count++;
  }
  return { done: count, pending: pending.length - count };
}
