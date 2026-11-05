import "server-only";
import { gunzipSync } from "node:zlib";
import { decodeActivityZip } from "@/lib/activities/fit";
import { readAll } from "@/lib/activities/store";
import { settingsFor, type HrSample, type HrSettings } from "@/lib/metrics/hr";
import { trimp, TRIMP_FORMULA_VERSION } from "@/lib/metrics/trimp";
import { timeInZones } from "@/lib/metrics/zones";
import { createAdminClient } from "@/lib/supabase/admin";
import { HISTORY_START } from "@/lib/sync/streams";

type Db = ReturnType<typeof createAdminClient>;

export async function readHrSettings(db: Pick<Db, "from">): Promise<HrSettings[]> {
  const { data, error } = await db.from("hr_settings").select("id, effective_from, max_hr, resting_hr, lthr").order("effective_from");
  if (error) throw new Error(error.message);
  return data.map((row) => ({ id: row.id, effectiveFrom: row.effective_from, maxHr: row.max_hr, restingHr: row.resting_hr, lthr: row.lthr }));
}

/**
 * With no settings yet, starts from the values Garmin uses for this account, effective from the start of
 * history, so every past activity gets a load. The owner replaces them in Ajustes.
 */
async function seedFromGarmin(db: Db) {
  const { count } = await db.from("hr_settings").select("id", { count: "exact", head: true });
  if (count) return;
  const { data: file } = await db.from("raw_files").select("storage_path").eq("kind", "heart_rate_zones").maybeSingle();
  if (!file) return;
  const { data } = await db.storage.from("raw").download(file.storage_path);
  if (!data) return;
  const zones: unknown = JSON.parse(gunzipSync(Buffer.from(await data.arrayBuffer())).toString());
  const list = Array.isArray(zones) ? zones : [];
  const pick = (list.find((z) => z?.sport === "DEFAULT") ?? list[0]) as Record<string, unknown> | undefined;
  const [maxHr, restingHr, lthr] = [pick?.maxHeartRateUsed, pick?.restingHeartRateUsed, pick?.lactateThresholdHeartRateUsed];
  if (typeof maxHr !== "number" || typeof restingHr !== "number" || typeof lthr !== "number") return;
  await db.from("hr_settings").insert({ effective_from: HISTORY_START, max_hr: maxHr, resting_hr: restingHr, lthr, source: "garmin" });
}

function hrSamples(zip: Uint8Array): HrSample[] {
  const decoded = decodeActivityZip(zip);
  if (!decoded) return [];
  const timed = decoded.records.filter((r) => r.timestamp instanceof Date && r.heartRate);
  if (timed.length === 0) return [];
  const start = timed[0].timestamp!.getTime();
  return timed.map((r) => ({ t: (r.timestamp!.getTime() - start) / 1000, hr: r.heartRate! }));
}

/**
 * Computes TRIMP and time in zones for activities that have none, were computed with another formula
 * version, or now fall under different HR settings. Resumable within the budget, like the parsers.
 */
export async function computePendingLoads(budgetMs: number) {
  const db = createAdminClient();
  const deadline = Date.now() + budgetMs;
  await seedFromGarmin(db);

  const [versions, activities, loads] = await Promise.all([
    readHrSettings(db),
    readAll((from, to) => db.from("activities").select("id, local_day, avg_hr").order("id").range(from, to)),
    readAll((from, to) => db.from("activity_loads").select("activity_id, hr_settings_id, formula_version").order("activity_id").range(from, to)),
  ]);
  const done = new Map(loads.map((l) => [l.activity_id, l]));
  const pending = activities.filter((a) => {
    const current = done.get(a.id);
    return !current || current.formula_version !== TRIMP_FORMULA_VERSION || current.hr_settings_id !== (settingsFor(a.local_day, versions)?.id ?? null);
  });

  let count = 0;
  for (const activity of pending) {
    if (Date.now() >= deadline) break;
    const settings = settingsFor(activity.local_day, versions);
    let samples: HrSample[] = [];
    if (activity.avg_hr !== null) {
      const { data } = await db.storage.from("raw").download(`activity_fit/${activity.id}.zip`);
      if (data) {
        try {
          samples = hrSamples(new Uint8Array(await data.arrayBuffer()));
        } catch {
          samples = [];
        }
      }
    }
    const load = trimp(samples, settings);
    const zones = timeInZones(samples, settings);
    const { error } = await db.from("activity_loads").upsert({
      activity_id: activity.id,
      hr_settings_id: settings?.id ?? null,
      formula_version: TRIMP_FORMULA_VERSION,
      trimp: load.available ? load.value : null,
      hr_minutes: load.available ? load.minutes : null,
      zone_seconds: zones.available ? zones.seconds.map(Math.round) : null,
      unavailable_reason: load.available ? null : load.reason,
      computed_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Saving load: ${error.message}`);
    count++;
  }
  return { done: count, pending: pending.length - count };
}
