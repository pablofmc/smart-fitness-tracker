import { describe, expect, it } from "vitest";
import { exerciseName, groupOf, summarizeSets, UNCLASSIFIED, weeklyFrequency, weeklySets, type FitSet } from "./sets";

const active = (category: (string | null)[] | null | undefined, repetitions?: number, duration?: number): FitSet => ({ setType: "active", category, repetitions, duration });
const rest: FitSet = { setType: "rest", duration: 60, category: null };

describe("summarizeSets", () => {
  it("totals active sets per exercise and group, using the first candidate", () => {
    const summary = summarizeSets([
      active(["squat", "unknown", "curl"], 12, 40),
      rest,
      active(["squat", "lunge", "unknown"], 10, 35),
      active(["benchPress", "shoulderPress", "unknown"], 8, 30),
      rest,
      active(["plank", "unknown", "unknown"], undefined, 60),
    ]);
    expect(summary).toEqual({
      totalSets: 4,
      totalReps: 30,
      activeSeconds: 165,
      unknownSets: 0,
      exercises: [
        { category: "squat", sets: 2, reps: 22, seconds: 75 },
        { category: "benchPress", sets: 1, reps: 8, seconds: 30 },
        { category: "plank", sets: 1, reps: 0, seconds: 60 },
      ],
      groupSets: { Piernas: 2, Empuje: 1, Core: 1 },
    });
  });

  it("counts unknown, missing and unlisted exercises as sin clasificar, listed last", () => {
    const summary = summarizeSets([active(["unknown", "curl", "benchPress"], 10, 20), active(null, 5, 10), active(["warmUp"], 0, 30), active(["row"], 10, 25), active(["row"], 10, 25)]);
    expect(summary.unknownSets).toBe(3);
    expect(summary.groupSets).toEqual({ [UNCLASSIFIED]: 3, Tirón: 2 });
    expect(summary.exercises.map((e) => e.category)).toEqual(["row", "warmUp", "unknown"]);
  });

  it("has nothing to count in a file without sets", () => {
    expect(summarizeSets([rest])).toEqual({ totalSets: 0, totalReps: 0, activeSeconds: 0, unknownSets: 0, exercises: [], groupSets: {} });
  });
});

describe("names and groups", () => {
  it("labels exercises in Spanish and never invents a group", () => {
    expect(exerciseName("squat")).toBe("Sentadilla");
    expect(exerciseName("unknown")).toBe(UNCLASSIFIED);
    expect(exerciseName("elliptical")).toBe("Otro ejercicio");
    expect(groupOf("hipSwing")).toBe("Cuerpo completo");
    expect(groupOf("cardio")).toBe(UNCLASSIFIED);
  });
});

describe("weeklyFrequency", () => {
  it("counts sessions per group in the 7 days ending that day, once per session", () => {
    const sessions = [
      { day: "2026-10-18", groupSets: { Piernas: 4 } }, // 8 days before: outside
      { day: "2026-10-19", groupSets: { Piernas: 3, Empuje: 2 } },
      { day: "2026-10-22", groupSets: { Piernas: 5, [UNCLASSIFIED]: 2 } },
      { day: "2026-10-25", groupSets: { Tirón: 3 } },
      { day: "2026-10-26", groupSets: { Core: 3 } }, // after: outside
    ];
    expect(weeklyFrequency(sessions, "2026-10-25")).toEqual([
      { group: "Piernas", sessions: 2 },
      { group: "Empuje", sessions: 1 },
      { group: "Tirón", sessions: 1 },
    ]);
  });
});

describe("weeklySets", () => {
  it("adds sets and sessions per group into Monday weeks, keeping empty weeks", () => {
    const weeks = weeklySets(
      [
        { day: "2026-10-20", groupSets: { Piernas: 4, [UNCLASSIFIED]: 1 } },
        { day: "2026-10-23", groupSets: { Piernas: 3 } },
        { day: "2026-11-03", groupSets: { Empuje: 2 } },
        { day: "2026-09-01", groupSets: { Core: 9 } }, // before the range
      ],
      "2026-10-21",
      "2026-11-03",
    );
    expect(weeks).toEqual([
      { monday: "2026-10-19", sets: { Piernas: 7, [UNCLASSIFIED]: 1 }, sessions: { Piernas: 2, [UNCLASSIFIED]: 1 } },
      { monday: "2026-10-26", sets: {}, sessions: {} },
      { monday: "2026-11-02", sets: { Empuje: 2 }, sessions: { Empuje: 1 } },
    ]);
  });
});
