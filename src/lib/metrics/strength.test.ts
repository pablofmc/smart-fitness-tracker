import { describe, expect, it } from "vitest";
import { beatsBest, bestByReps, dailyBest1RM, epley, percentLoad, platesPerSide, recordBoard, repsAt, sessionBests, strengthRecords, volumeBy, weeklyVolume, weightProgression, type StrengthSet } from "./strength";

const set = (over: Partial<StrengthSet>): StrengthSet => ({ exercise: "Sentadilla", group: "Piernas", day: "2026-11-03", at: "2026-11-03T10:00:00Z", kg: 60, reps: 8, ...over });

describe("epley (golden cases computed by hand)", () => {
  it("60 kg × 8 → 60 × (1 + 8/30) = 76", () => {
    expect(epley(60, 8)).toMatchObject({ available: true, value: 76 });
  });

  it("62.5 kg × 8 → 62.5 × 1.2667 = 79.2", () => {
    expect(epley(62.5, 8)).toMatchObject({ available: true, value: 79.2 });
  });

  it("100 kg × 10 → 100 × 1.3333 = 133.3, the last rep count allowed", () => {
    expect(epley(100, 10)).toMatchObject({ available: true, value: 133.3 });
  });

  it("a 1-rep set gives its own weight", () => {
    expect(epley(120, 1)).toMatchObject({ available: true, value: 120 });
  });

  it("is not available above 10 reps, without weight, or without reps", () => {
    expect(epley(40, 11)).toEqual({ available: false, reason: "Más de 10 repeticiones" });
    expect(epley(0, 8)).toEqual({ available: false, reason: "Sin peso" });
    expect(epley(40, 0)).toEqual({ available: false, reason: "Sin repeticiones" });
  });

  it("shows how it was computed", () => {
    expect(epley(60, 8)).toMatchObject({ inputs: "60 kg × 8: 60 × (1 + 8/30)" });
  });
});

describe("volume", () => {
  it("sums sets × reps × kg per exercise and per group", () => {
    const sets = [set({ kg: 60, reps: 8 }), set({ kg: 62.5, reps: 8 }), set({ exercise: "Press de banca", group: "Empuje", kg: 50, reps: 10 }), set({ exercise: "Plancha", group: "Core", kg: 0, reps: 1 })];
    // 480 + 500 = 980 for squats; 500 for bench; 0 for a set without weight.
    expect(Object.fromEntries(volumeBy(sets, (s) => s.exercise))).toEqual({ Sentadilla: 980, "Press de banca": 500, Plancha: 0 });
    expect(Object.fromEntries(volumeBy(sets, (s) => s.group))).toEqual({ Piernas: 980, Empuje: 500, Core: 0 });
  });

  it("groups by week starting Monday and leaves out weeks with no logged sets", () => {
    const weeks = weeklyVolume([
      set({ day: "2026-11-02", kg: 60, reps: 8 }), // Monday
      set({ day: "2026-11-08", kg: 50, reps: 10 }), // Sunday, same week
      set({ day: "2026-11-23", group: "Empuje", kg: 40, reps: 10 }), // two weeks later
    ]);
    expect(weeks).toEqual([
      { monday: "2026-11-02", byGroup: { Piernas: 980 }, total: 980 },
      { monday: "2026-11-23", byGroup: { Empuje: 400 }, total: 400 },
    ]);
  });
});

describe("dailyBest1RM", () => {
  it("takes the best set of each day and skips sets Epley can't use", () => {
    const sets = [
      set({ day: "2026-11-03", kg: 60, reps: 8 }), // 76
      set({ day: "2026-11-03", kg: 70, reps: 3 }), // 77
      set({ day: "2026-11-03", kg: 40, reps: 15 }), // too many reps
      set({ day: "2026-11-05", kg: 40, reps: 15 }), // only unusable sets: the day is absent
      set({ day: "2026-11-06", exercise: "Press de banca", kg: 50, reps: 5 }),
    ];
    expect(dailyBest1RM(sets, "Sentadilla").map((d) => [d.day, d.value])).toEqual([["2026-11-03", 77]]);
  });
});

describe("strengthRecords", () => {
  it("marks sets that beat every earlier weight or estimated 1RM, after the first one", () => {
    const records = strengthRecords([
      set({ day: "2026-10-27", at: "1", kg: 60, reps: 8 }), // baseline: 60 kg, 76
      set({ day: "2026-11-03", at: "1", kg: 60, reps: 10 }), // 80: 1RM record, same weight
      set({ day: "2026-11-03", at: "2", kg: 62.5, reps: 6 }), // 75: weight record only
      set({ day: "2026-11-06", at: "1", kg: 62.5, reps: 6 }), // ties: nothing
      set({ day: "2026-11-06", at: "2", kg: 65, reps: 8 }), // 82.3: both
    ]);
    expect(records.map((r) => [r.day, r.kg, r.reps, r.kinds])).toEqual([
      ["2026-11-03", 60, 10, ["1rm"]],
      ["2026-11-03", 62.5, 6, ["weight"]],
      ["2026-11-06", 65, 8, ["weight", "1rm"]],
    ]);
  });

  it("tracks each exercise on its own", () => {
    expect(strengthRecords([set({ kg: 60 }), set({ exercise: "Press de banca", kg: 40, at: "2" })])).toEqual([]);
  });

  it("beatsBest marks a set while training", () => {
    expect(beatsBest({ kg: 65, reps: 5 }, { kg: 62.5, e1rm: 79.2 })).toEqual(["weight"]); // 75.8 < 79.2
    expect(beatsBest({ kg: 60, reps: 10 }, { kg: 62.5, e1rm: 79.2 })).toEqual(["1rm"]); // 80
    expect(beatsBest({ kg: 65, reps: 5 }, null)).toEqual([]);
  });
});

describe("records board", () => {
  const dl = (day: string, kg: number, reps: number, at = "10:00") => set({ exercise: "Peso muerto", group: "Tirón", day, at: `${day}T${at}:00Z`, kg, reps });
  const sets = [
    dl("2026-09-15", 80, 8),
    dl("2026-09-24", 85, 6),
    dl("2026-09-24", 85, 8, "10:05"),
    dl("2026-10-27", 95, 2),
    dl("2026-11-12", 100, 3),
    dl("2026-11-12", 90, 12, "10:10"),
    set({ exercise: "Plancha", group: "Core", kg: 10, reps: 15 }),
    set({ exercise: "Dominadas", group: "Tirón", kg: 0, reps: 8 }),
  ];

  it("lists each exercise with weight once, with its heaviest set and best 1RM", () => {
    const board = recordBoard(sets);
    expect(board.map((r) => r.exercise).sort()).toEqual(["Peso muerto", "Plancha"]);
    // 80×8 → 101.3, 85×8 → 107.7, 95×2 → 101.3, 100×3 → 110; 90×12 has no 1RM.
    expect(board.find((r) => r.exercise === "Peso muerto")).toMatchObject({
      heaviest: { kg: 100, reps: 3, day: "2026-11-12" },
      best1rm: { kg: 100, reps: 3, value: 110 },
      sessions: 4,
      firstDay: "2026-09-15",
      bestDay: "2026-11-12",
    });
    expect(board.find((r) => r.exercise === "Plancha")?.best1rm).toBeNull();
  });

  it("breaks a weight tie by reps", () => {
    expect(recordBoard([dl("2026-09-24", 85, 6), dl("2026-09-25", 85, 8)])[0].heaviest).toMatchObject({ kg: 85, reps: 8, day: "2026-09-25" });
  });

  it("keeps each day's heaviest set and best 1RM", () => {
    expect(sessionBests(sets, "Peso muerto").slice(1, 2)).toEqual([{ day: "2026-09-24", kg: 85, reps: 8, e1rm: 107.7 }]);
    expect(sessionBests(sets, "Peso muerto").at(-1)).toEqual({ day: "2026-11-12", kg: 100, reps: 3, e1rm: 110 });
  });

  it("finds the heaviest set with at least N reps", () => {
    expect(bestByReps(sets, "Peso muerto")).toEqual([
      { reps: 1, kg: 100 },
      { reps: 3, kg: 100 },
      { reps: 5, kg: 90 },
      { reps: 8, kg: 90 },
      { reps: 10, kg: 90 },
    ]);
    expect(bestByReps(sets, "Peso muerto", [15])).toEqual([{ reps: 15, kg: null }]);
  });

  it("traces how the heaviest weight grew", () => {
    expect(weightProgression(sets, "Peso muerto").map((p) => [p.kg, p.delta])).toEqual([
      [80, null],
      [85, 5],
      [95, 10],
      [100, 5],
    ]);
  });
});

describe("load calculator (golden)", () => {
  it("rounds a percentage to 2.5 kg, never below the bar", () => {
    expect(percentLoad(110, 70)).toEqual({ exact: 77, target: 77.5 });
    expect(percentLoad(100, 60)).toEqual({ exact: 60, target: 60 });
    expect(percentLoad(30, 50)).toEqual({ exact: 15, target: 20 });
  });

  it("puts the plates per side on a 20 kg bar, heaviest first", () => {
    expect(platesPerSide(77.5)).toEqual([25, 2.5, 1.25]);
    expect(platesPerSide(140)).toEqual([25, 25, 10]);
    expect(platesPerSide(20)).toEqual([]);
  });

  it("works in lb: 45 lb bar, 5 lb steps, lb plates", () => {
    const lb = { bar: 45, step: 5, plates: [45, 35, 25, 10, 5, 2.5] };
    // 70 % of 245 lb = 171.5 → 170; (170 − 45) / 2 = 62.5 per side = 45 + 10 + 5 + 2.5.
    expect(percentLoad(245, 70, lb)).toEqual({ exact: 171.5, target: 170 });
    expect(platesPerSide(170, lb)).toEqual([45, 10, 5, 2.5]);
    expect(percentLoad(50, 60, lb).target).toBe(45);
  });

  it("gives the reps Epley allows: 30 × (1RM / kg − 1), rounded down", () => {
    expect(repsAt(77.5, 110)).toBe(12); // 12.58
    expect(repsAt(100, 110)).toBe(3);
    expect(repsAt(110, 110)).toBe(1);
  });
});
