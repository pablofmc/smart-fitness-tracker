import { describe, expect, it } from "vitest";
import { addSet, markSynced, pendingCount, prefill, recordSetIds, removeSet, targetRepsNumber, type ActiveSession, type SessionExercise } from "./session";

const exercise = (over: Partial<SessionExercise> = {}): SessionExercise => ({
  key: "0",
  name: "Sentadilla",
  category: "squat",
  target: "4 × 8 · 60 kg",
  targetKg: 60,
  targetReps: "8",
  last: null,
  ...over,
});
const session = (exercises: SessionExercise[] = [exercise()]): ActiveSession => ({
  id: "s1",
  routineId: 1,
  name: "Pierna",
  localDay: "2026-11-06",
  startedAt: "2026-11-06T10:00:00Z",
  endedAt: null,
  exercises,
  sets: [],
  headerSynced: false,
  deletedSetIds: [],
});
const now = new Date("2026-11-06T10:05:00Z");

describe("prefill", () => {
  it("repeats the previous set of this session", () => {
    const s = addSet(session([exercise({ last: { kg: 50, reps: 10, day: "2026-11-01" } })]), "0", { kg: 62.5, reps: 7 }, "a", now);
    expect(prefill(s, "0")).toEqual({ kg: 62.5, reps: 7 });
  });

  it("starts from the last time I did the exercise", () => {
    expect(prefill(session([exercise({ last: { kg: 57.5, reps: 8, day: "2026-11-01" } })]), "0")).toEqual({ kg: 57.5, reps: 8 });
  });

  it("falls back to the routine's target, reading ranges by their first number", () => {
    expect(prefill(session([exercise({ targetKg: 20, targetReps: "10-12" })]), "0")).toEqual({ kg: 20, reps: 10 });
  });

  it("offers an empty bar for 8 when there is nothing to go on", () => {
    expect(prefill(session([exercise({ targetKg: null, targetReps: null })]), "0")).toEqual({ kg: 0, reps: 8 });
  });
});

describe("targetRepsNumber", () => {
  it("reads counts but not times", () => {
    expect(targetRepsNumber("12 c/lado")).toBe(12);
    expect(targetRepsNumber("45 s")).toBeNull();
    expect(targetRepsNumber(null)).toBeNull();
  });
});

describe("sets", () => {
  it("numbers sets per exercise", () => {
    let s = session([exercise(), exercise({ key: "1", name: "Zancada" })]);
    s = addSet(s, "0", { kg: 60, reps: 8 }, "a", now);
    s = addSet(s, "1", { kg: 20, reps: 10 }, "b", now);
    s = addSet(s, "0", { kg: 60, reps: 8 }, "c", now);
    expect(s.sets.map((x) => [x.exerciseKey, x.setNumber])).toEqual([["0", 1], ["1", 1], ["0", 2]]);
  });

  it("renumbers after removing a set and resends the ones that moved", () => {
    let s = session();
    for (const id of ["a", "b", "c"]) s = addSet(s, "0", { kg: 60, reps: 8 }, id, now);
    s = markSynced(s, { headerSent: true, sets: s.sets });
    s = removeSet(s, "a");
    expect(s.sets.map((x) => [x.id, x.setNumber, x.synced])).toEqual([["b", 1, false], ["c", 2, false]]);
    expect(s.deletedSetIds).toEqual(["a"]);
    expect(markSynced(s, { headerSent: false, sets: [], deletedSetIds: ["a"] }).deletedSetIds).toEqual([]);
  });

  it("counts sets waiting for the server until they are confirmed", () => {
    let s = addSet(session(), "0", { kg: 60, reps: 8 }, "a", now);
    s = addSet(s, "0", { kg: 60, reps: 8 }, "b", now);
    expect(pendingCount(s)).toBe(2);
    s = markSynced(s, { headerSent: true, sets: [s.sets[0]] });
    expect(pendingCount(s)).toBe(1);
    expect(s.headerSynced).toBe(true);
  });

  it("keeps a set waiting if it changed while it was being sent", () => {
    let s = addSet(session(), "0", { kg: 60, reps: 8 }, "a", now);
    const sent = s.sets;
    s = { ...s, sets: s.sets.map((x) => ({ ...x, kg: 62.5 })) };
    expect(pendingCount(markSynced(s, { headerSent: true, sets: sent }))).toBe(1);
  });
});

describe("recordSetIds", () => {
  it("marks the sets that beat earlier bests, raising the bar as the session goes", () => {
    let s = session([exercise({ best: { kg: 60, e1rm: 76 } })]);
    s = addSet(s, "0", { kg: 60, reps: 8 }, "a", new Date("2026-11-06T10:01:00Z")); // 76: ties
    s = addSet(s, "0", { kg: 62.5, reps: 8 }, "b", new Date("2026-11-06T10:03:00Z")); // record
    s = addSet(s, "0", { kg: 62.5, reps: 8 }, "c", new Date("2026-11-06T10:05:00Z")); // ties the new bar
    expect([...recordSetIds(s)]).toEqual(["b"]);
  });

  it("marks nothing for an exercise logged for the first time", () => {
    const s = addSet(session([exercise({ best: null })]), "0", { kg: 100, reps: 5 }, "a", now);
    expect(recordSetIds(s).size).toBe(0);
  });
});
