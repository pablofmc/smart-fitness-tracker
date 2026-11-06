import { describe, expect, it } from "vitest";
import { candidatesFor, compareRows, linksToMake, type ActivityForLink, type SessionForLink } from "./link";

const session = (over: Partial<SessionForLink> = {}): SessionForLink => ({
  id: "s1",
  localDay: "2026-11-06",
  startedAt: "2026-11-06T10:42:00Z",
  endedAt: "2026-11-06T11:30:00Z",
  lastSetAt: "2026-11-06T11:28:00Z",
  activityId: null,
  linkSource: null,
  ...over,
});
const activity = (id: number, startedAt: string, minutes: number, localDay = "2026-11-06"): ActivityForLink => ({ id, localDay, startedAt, durationS: minutes * 60 });

describe("linking a logged session to a Garmin strength activity", () => {
  it("links the one activity that overlaps", () => {
    expect(linksToMake([session()], [activity(7, "2026-11-06T10:40:00Z", 52)])).toEqual([{ sessionId: "s1", activityId: 7 }]);
  });

  it("does not link an activity that doesn't overlap", () => {
    expect(linksToMake([session()], [activity(7, "2026-11-06T17:00:00Z", 45)])).toEqual([]);
  });

  it("does not link an activity of another day, even at the same time", () => {
    expect(linksToMake([session()], [activity(7, "2026-11-06T10:40:00Z", 52, "2026-11-05")])).toEqual([]);
  });

  it("waits for me to pick when two activities overlap", () => {
    const two = [activity(7, "2026-11-06T10:40:00Z", 52), activity(8, "2026-11-06T11:35:00Z", 15)];
    expect(candidatesFor(session(), two).map((a) => a.id)).toEqual([7, 8]);
    expect(linksToMake([session()], two)).toEqual([]);
  });

  it("counts a watch started up to 10 minutes after the last set as overlapping", () => {
    expect(candidatesFor(session(), [activity(7, "2026-11-06T11:39:00Z", 20)])).toHaveLength(1);
    expect(candidatesFor(session(), [activity(7, "2026-11-06T11:41:00Z", 20)])).toHaveLength(0);
  });

  it("uses the last set when the session was never closed", () => {
    const open = session({ endedAt: null, lastSetAt: "2026-11-06T11:00:00Z" });
    expect(candidatesFor(open, [activity(7, "2026-11-06T11:05:00Z", 30)])).toHaveLength(1);
  });

  it("leaves a link I picked by hand alone", () => {
    expect(linksToMake([session({ activityId: 8, linkSource: "manual" })], [activity(7, "2026-11-06T10:40:00Z", 52)])).toEqual([]);
  });
});

describe("compareRows", () => {
  it("pairs exercises by key and keeps both sides as they are", () => {
    const rows = compareRows(
      [
        { exerciseName: "Sentadilla", category: "squat", position: 0, kg: 60, reps: 8 },
        { exerciseName: "Sentadilla", category: "squat", position: 0, kg: 62.5, reps: 8 },
        { exerciseName: "Hip thrust", category: null, position: 1, kg: 70, reps: 12 },
      ],
      [
        { category: "squat", name: "Sentadilla", sets: 3, reps: 25 },
        { category: "unknown", name: "Sin clasificar", sets: 4, reps: 38 },
        { category: "plank", name: "Plancha", sets: 3, reps: 0 },
      ],
    );
    expect(rows).toEqual([
      { name: "Sentadilla", logged: { sets: 2, reps: 16, sameReps: 8, minKg: 60, maxKg: 62.5 }, watch: { sets: 3, reps: 25 }, unclassified: false },
      { name: "Hip thrust", logged: { sets: 1, reps: 12, sameReps: 12, minKg: 70, maxKg: 70 }, watch: null, unclassified: false },
      { name: "Plancha", logged: null, watch: { sets: 3, reps: 0 }, unclassified: false },
      { name: "Sin clasificar", logged: null, watch: { sets: 4, reps: 38 }, unclassified: true },
    ]);
  });
});
