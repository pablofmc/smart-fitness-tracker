import { z } from "zod";
import { GarminRequestError, type GarminClient } from "@/lib/garmin/client";
import { addDays, HISTORY_START, RANGE_STREAMS, SNAPSHOT_STREAMS, windowEnd, windowStart, type RangeStream } from "./streams";

export const ACTIVITIES_STREAM = "activities";
const RECENT_HEALTH_STREAM = "recent_health";
const SEARCH_PATH = "/activitylist-service/activities/search/activities";
const PAGE_SIZE = 100;
const RECENT_PAGE_SIZE = 50;
/** Health days fill up slowly, so the 30-minute runs refresh them at this pace to go easy on Garmin. */
const RECENT_HEALTH_EVERY_MS = 3 * 3_600_000;

export type Cursor = { position: string | null; completed: boolean; updatedAt: string | null };

export type ArchiveItem = { kind: string; sourceKey: string; bytes: Uint8Array; format: "json" | "zip" };

export type SyncStore = {
  getCursor(stream: string): Promise<Cursor | null>;
  saveCursor(stream: string, position: string | null, completed: boolean): Promise<void>;
  hasRaw(kind: string, sourceKey: string): Promise<boolean>;
  /** Returns false when an identical payload is already archived. */
  archive(item: ArchiveItem): Promise<boolean>;
};

export type SyncOptions = {
  garmin: Pick<GarminClient, "getBytes" | "downloadActivity">;
  store: SyncStore;
  today: string;
  /** "Sincronizar ahora" refreshes health data even when it's recent. */
  forceRecentHealth: boolean;
  now?: () => number;
  budgetMs: number;
};

export type SyncResult = { itemsFetched: number; failures: string[]; outOfTime: boolean };

/** Only the ID is needed here. The rest of the payload goes to the archive untouched (ADR-0003). */
const activityItem = z.looseObject({ activityId: z.number().optional(), startTimeLocal: z.string().optional() });
const activityPosition = z.object({ start: z.number(), oldest: z.string().nullable() });

const encoder = new TextEncoder();

/**
 * One sync run: everything new first, then as much history as fits in the time budget.
 * Blocked and unavailable errors end the run, and the cursors let the next run carry on.
 */
export async function runSync({ garmin, store, today, forceRecentHealth, now = Date.now, budgetMs }: SyncOptions): Promise<SyncResult> {
  const deadline = now() + budgetMs;
  const hasTime = () => now() < deadline;
  const result: SyncResult = { itemsFetched: 0, failures: [], outOfTime: false };

  async function archive(item: ArchiveItem) {
    if (await store.archive(item)) result.itemsFetched++;
  }

  /** A refusal on one stream (a 400, say) shouldn't stop the others. */
  async function guarded(stream: string, work: () => Promise<void>) {
    try {
      await work();
    } catch (error) {
      if (!(error instanceof GarminRequestError)) throw error;
      result.failures.push(`${stream}: HTTP ${error.status}`);
    }
  }

  async function fetchWindow(stream: RangeStream, start: string) {
    const { path, params } = stream.request(start, windowEnd(start, stream.maxDays, today));
    const bytes = await garmin.getBytes(path, { params });
    if (bytes) await archive({ kind: stream.name, sourceKey: start, bytes, format: "json" });
  }

  /** Archives one search page. Returns how many items it covered before time ran out, and the oldest day. */
  async function archiveActivities(items: unknown[]) {
    let covered = 0;
    let oldest: string | null = null;
    for (const raw of items) {
      if (!hasTime()) break;
      const item = activityItem.safeParse(raw);
      const id = item.success ? item.data.activityId : undefined;
      if (id !== undefined) {
        const key = String(id);
        await archive({ kind: "activity_summary", sourceKey: key, bytes: encoder.encode(JSON.stringify(raw)), format: "json" });
        if (!(await store.hasRaw("activity_fit", key))) {
          const zip = await garmin.downloadActivity(id);
          if (zip) await archive({ kind: "activity_fit", sourceKey: key, bytes: zip, format: "zip" });
        }
        oldest = item.data?.startTimeLocal?.slice(0, 10) ?? oldest;
      }
      covered++;
    }
    return { covered, oldest };
  }

  async function searchPage(start: number, limit: number) {
    const bytes = await garmin.getBytes(SEARCH_PATH, { params: { start, limit } });
    const parsed = z.array(z.unknown()).safeParse(bytes ? JSON.parse(new TextDecoder().decode(bytes)) : []);
    return parsed.success ? parsed.data : [];
  }

  // New activities, on every run.
  await guarded(ACTIVITIES_STREAM, async () => {
    await archiveActivities(await searchPage(0, RECENT_PAGE_SIZE));
  });

  // Recent health days and undated payloads.
  const recent = await store.getCursor(RECENT_HEALTH_STREAM);
  const lastRefresh = recent?.updatedAt ? Date.parse(recent.updatedAt) : 0;
  if (forceRecentHealth || now() - lastRefresh >= RECENT_HEALTH_EVERY_MS) {
    for (const snapshot of SNAPSHOT_STREAMS) {
      await guarded(snapshot.name, async () => {
        const bytes = await garmin.getBytes(snapshot.path);
        if (bytes) await archive({ kind: snapshot.name, sourceKey: "current", bytes, format: "json" });
      });
    }
    for (const stream of RANGE_STREAMS) {
      if (!hasTime()) break;
      await guarded(stream.name, async () => {
        // Yesterday too, because last night's data can land after midnight or cross a window edge.
        const current = windowStart(today, stream.maxDays);
        const previous = windowStart(addDays(today, -1), stream.maxDays);
        if (previous !== current) await fetchWindow(stream, previous);
        await fetchWindow(stream, current);
      });
    }
    if (hasTime()) await store.saveCursor(RECENT_HEALTH_STREAM, today, false);
  }

  // Activity history, newest first because that's how Garmin pages it.
  const activities = await store.getCursor(ACTIVITIES_STREAM);
  if (!activities?.completed) {
    await guarded(ACTIVITIES_STREAM, async () => {
      const saved = activities?.position ? activityPosition.parse(JSON.parse(activities.position)) : { start: 0, oldest: null };
      let { start, oldest } = saved;
      while (hasTime()) {
        const items = await searchPage(start, PAGE_SIZE);
        const page = await archiveActivities(items);
        start += page.covered;
        oldest = page.oldest ?? oldest;
        const finished = page.covered === items.length && items.length < PAGE_SIZE;
        await store.saveCursor(ACTIVITIES_STREAM, JSON.stringify({ start, oldest }), finished);
        if (finished) break;
      }
    });
  }

  // Health history, oldest first, one window at a time.
  for (const stream of RANGE_STREAMS) {
    if (!hasTime()) break;
    const cursor = await store.getCursor(stream.name);
    if (cursor?.completed) continue;
    await guarded(stream.name, async () => {
      let start = cursor?.position ?? HISTORY_START;
      while (hasTime() && start <= today) {
        await fetchWindow(stream, start);
        start = addDays(start, stream.maxDays);
        await store.saveCursor(stream.name, start, start > today);
      }
    });
  }

  result.outOfTime = !hasTime();
  return result;
}
