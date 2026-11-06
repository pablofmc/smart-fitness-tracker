import { describe, expect, it } from "vitest";
import { lineText, sessionLines, type HistorySet } from "./history";

const set = (id: string, over: Partial<HistorySet>): HistorySet => ({ id, exercise: "squat", label: "Sentadilla", position: 0, kg: 60, reps: 8, ...over });

describe("sessionLines", () => {
  it("summarizes each exercise in the order trained", () => {
    const lines = sessionLines(
      [
        set("a", { exercise: "row", label: "Remo", position: 1, kg: 40, reps: 10 }),
        set("b", { kg: 60 }),
        set("c", { kg: 62.5 }),
        set("d", { exercise: "row", label: "Remo", position: 1, kg: 40, reps: 8 }),
      ],
      new Set(["c"]),
    );
    expect(lines).toEqual([
      { exercise: "squat", label: "Sentadilla", sets: 2, reps: 16, sameReps: 8, minKg: 60, maxKg: 62.5, record: true },
      { exercise: "row", label: "Remo", sets: 2, reps: 18, sameReps: null, minKg: 40, maxKg: 40, record: false },
    ]);
  });
});

describe("lineText", () => {
  it("reads like the routine", () => {
    expect(lineText({ sets: 4, reps: 32, sameReps: 8, minKg: 60, maxKg: 62.5 })).toBe("4 × 8 · 60–62,5 kg");
    expect(lineText({ sets: 3, reps: 26, sameReps: null, minKg: 20, maxKg: 20 })).toBe("3 series · 26 reps · 20 kg");
    expect(lineText({ sets: 3, reps: 36, sameReps: 12, minKg: 0, maxKg: 0 })).toBe("3 × 12 · sin peso");
  });
});
