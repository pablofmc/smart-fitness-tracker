import { describe, expect, it } from "vitest";
import { GarminBlockedError, GarminRequestError } from "@/lib/garmin/client";
import { runSync, type ArchiveItem, type Cursor, type SyncOptions, type SyncStore } from "./run";
import { RANGE_STREAMS } from "./streams";

const TODAY = "2023-01-10";
const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
const activity = (id: number, day: string) => ({ activityId: id, startTimeLocal: `${day} 07:00:00`, unknownField: "kept" });

function memoryStore() {
  const raw = new Map<string, string>();
  const cursors = new Map<string, Cursor>();
  const store: SyncStore = {
    getCursor: async (stream) => cursors.get(stream) ?? null,
    saveCursor: async (stream, position, completed) => {
      cursors.set(stream, { position, completed, updatedAt: new Date(0).toISOString() });
    },
    hasRaw: async (kind, key) => raw.has(`${kind}/${key}`),
    archive: async ({ kind, sourceKey, bytes }: ArchiveItem) => {
      const id = `${kind}/${sourceKey}`;
      const body = new TextDecoder().decode(bytes);
      if (raw.get(id) === body) return false;
      raw.set(id, body);
      return true;
    },
  };
  return { store, raw, cursors };
}

function fakeGarmin(activities: unknown[], fail?: (path: string) => void) {
  const calls: string[] = [];
  const downloads: (number | string)[] = [];
  const garmin: SyncOptions["garmin"] = {
    getBytes: async (path, options) => {
      calls.push(path);
      fail?.(path);
      if (path.includes("activities/search")) {
        const { start, limit } = options!.params as { start: number; limit: number };
        return encode(activities.slice(start, start + limit));
      }
      return encode({ path, params: options?.params });
    },
    downloadActivity: async (id) => {
      downloads.push(id);
      return encode(`zip-${id}`);
    },
  };
  return { garmin, calls, downloads };
}

const run = (garmin: SyncOptions["garmin"], store: SyncStore, extra: Partial<SyncOptions> = {}) =>
  runSync({ garmin, store, today: TODAY, forceRecentHealth: false, budgetMs: 60_000, ...extra });

describe("runSync", () => {
  it("archives every activity with its .FIT, and every health window", async () => {
    const { store, raw, cursors } = memoryStore();
    const { garmin } = fakeGarmin([activity(2, "2023-01-02"), activity(1, "2022-12-01")]);
    const result = await run(garmin, store);

    expect(raw.has("activity_summary/1")).toBe(true);
    expect(raw.has("activity_fit/1")).toBe(true);
    expect(raw.has("activity_fit/2")).toBe(true);
    expect(raw.has("stress/2022-11-01")).toBe(true);
    expect(raw.has("stress/2022-12-27")).toBe(true);
    expect(raw.has("sleep_daily/2023-01-10")).toBe(true);
    expect(cursors.get("activities")?.completed).toBe(true);
    expect(cursors.get("stress")?.completed).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.outOfTime).toBe(false);
  });

  it("keeps unknown fields in the raw payload (ADR-0003)", async () => {
    const { store, raw } = memoryStore();
    const { garmin } = fakeGarmin([activity(1, "2022-12-01")]);
    await run(garmin, store);
    expect(raw.get("activity_summary/1")).toContain("unknownField");
  });

  it("creates nothing new when run again, and never downloads a .FIT twice (R-SYN-06)", async () => {
    const { store, raw } = memoryStore();
    const { garmin, downloads } = fakeGarmin([activity(1, "2022-12-01")]);
    await run(garmin, store);
    const size = raw.size;

    const again = await run(garmin, store, { forceRecentHealth: true });
    expect(raw.size).toBe(size);
    expect(again.itemsFetched).toBe(0);
    expect(downloads).toEqual([1]);
  });

  it("stops at the time budget and resumes from the cursor", async () => {
    const { store, raw } = memoryStore();
    const { garmin, downloads } = fakeGarmin(Array.from({ length: 150 }, (_, i) => activity(i, "2022-12-01")));
    let clock = 0;
    const timed = { now: () => (clock += 1), budgetMs: 200 };

    const first = await run(garmin, store, timed);
    expect(first.outOfTime).toBe(true);
    expect(raw.size).toBeGreaterThan(0);

    for (let i = 0; i < 40 && !raw.has("food_logs/2023-01-10"); i++) await run(garmin, store, { ...timed });
    expect(raw.has("activity_fit/149")).toBe(true);
    expect(raw.has("food_logs/2023-01-10")).toBe(true);
    expect(new Set(downloads).size).toBe(downloads.length);
  });

  it("carries on with other streams after a refusal, and reports it", async () => {
    const { store, raw, cursors } = memoryStore();
    const { garmin } = fakeGarmin([], (path) => {
      if (path.includes("/stats/hydration/")) throw new GarminRequestError(path, 400);
    });
    const result = await run(garmin, store);

    expect(result.failures.some((f) => f.startsWith("hydration: HTTP 400"))).toBe(true);
    expect(cursors.get("hydration")?.completed).not.toBe(true);
    expect(raw.has("stress/2022-11-01")).toBe(true);
  });

  it("ends the run when Garmin rejects the key", async () => {
    const { store } = memoryStore();
    const { garmin } = fakeGarmin([], () => {
      throw new GarminBlockedError();
    });
    await expect(run(garmin, store)).rejects.toBeInstanceOf(GarminBlockedError);
  });

  it("refreshes recent health data only every few hours, unless asked", async () => {
    const { store, cursors } = memoryStore();
    const { garmin, calls } = fakeGarmin([]);
    const at = Date.parse(`${TODAY}T12:00:00Z`);
    await run(garmin, store, { now: () => at });
    for (const stream of RANGE_STREAMS) cursors.set(stream.name, { position: null, completed: true, updatedAt: null });
    cursors.set("recent_health", { position: TODAY, completed: false, updatedAt: new Date(at).toISOString() });

    calls.length = 0;
    await run(garmin, store, { now: () => at + 3_600_000 });
    expect(calls.every((path) => path.includes("activities/search"))).toBe(true);

    calls.length = 0;
    await run(garmin, store, { now: () => at + 3_600_000, forceRecentHealth: true });
    expect(calls.some((path) => path.includes("/stats/stress/"))).toBe(true);
  });

  it("skips an activity with no ID, rather than failing the run", async () => {
    const { store, raw } = memoryStore();
    const { garmin } = fakeGarmin([{ startTimeLocal: "2022-12-01 07:00:00" }, activity(1, "2022-12-01")]);
    await run(garmin, store);
    expect(raw.has("activity_fit/1")).toBe(true);
  });
});
